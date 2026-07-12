/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  Sandbox,
  SandboxProvider,
  SandboxCapabilities,
  SandboxInfo,
  SandboxProviderMetadata,
  SandboxSpec,
} from './sandbox_provider';
import { KubectlRunner, LOCAL_K8S_PROVIDER_ID } from './kubectl_runner';
import { KubectlSandbox } from './kubectl_sandbox';

export interface SandboxConfig {
  kubeContext: string;
  namespace: string;
  image: string;
  maxRunSeconds: number;
}

// Re-exported for existing importers. Prefer the provider-neutral types.
export type SandboxPodInfo = SandboxInfo;
export type { SandboxExecResult, SandboxProviderMetadata } from './sandbox_provider';
export type SandboxClusterMetadata = SandboxProviderMetadata;

/**
 * Provisions sandbox pods on a local Kubernetes (kind) cluster. This is the
 * first "bring your own sandbox" provider; Cloud Run / remote k8s / E2B slot in
 * behind the same `SandboxProvider` interface without touching the runtime or
 * lifecycle layers.
 */
export class SandboxManager implements SandboxProvider {
  readonly id = LOCAL_K8S_PROVIDER_ID;
  readonly displayName = 'Local Kubernetes (kind)';
  readonly capabilities: SandboxCapabilities = {
    supportsSnapshot: false, // deferred (KubectlSandbox.snapshot)
    supportsEgressControl: true, // enforced via NetworkPolicy
    isLocal: true,
  };

  private readonly kubectl: KubectlRunner;

  constructor(private readonly config: SandboxConfig, private readonly logger: Logger) {
    this.kubectl = new KubectlRunner(config.kubeContext, config.namespace, logger);
  }

  async create(spec: SandboxSpec): Promise<Sandbox> {
    await this.createPod(spec.name);
    return new KubectlSandbox(spec.name, this.kubectl);
  }

  async get(id: string): Promise<Sandbox | undefined> {
    const sandbox = new KubectlSandbox(id, this.kubectl);
    const desc = await sandbox.describe();
    if (desc.phase === 'Unknown' && !desc.ready) return undefined;
    return sandbox;
  }

  /**
   * Create a labelled sandbox pod and wait until it's Ready. The pod carries the
   * `role: subagent` label so the egress NetworkPolicy applies.
   */
  private async createPod(podName: string): Promise<void> {
    const manifest = JSON.stringify({
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: podName,
        labels: { app: 'opencode-sandbox', role: 'subagent' },
      },
      spec: {
        automountServiceAccountToken: false,
        restartPolicy: 'Never',
        activeDeadlineSeconds: this.config.maxRunSeconds,
        containers: [
          {
            name: 'opencode',
            image: this.config.image,
            imagePullPolicy: 'IfNotPresent',
            command: ['sleep', 'infinity'],
            resources: {
              requests: { cpu: '500m', memory: '1Gi' },
              limits: { cpu: '2', memory: '4Gi' },
            },
            volumeMounts: [{ name: 'workspace', mountPath: '/workspace' }],
            securityContext: {
              allowPrivilegeEscalation: false,
              runAsNonRoot: true,
              runAsUser: 1000,
              capabilities: { drop: ['ALL'] },
            },
          },
        ],
        volumes: [{ name: 'workspace', emptyDir: { sizeLimit: '5Gi' } }],
      },
    });

    this.logger.info(`Creating sandbox pod ${podName}`);
    await this.kubectl.run(['apply', '-f', '-'], manifest);
    await this.kubectl.run(
      ['wait', '--for=condition=Ready', `pod/${podName}`, '--timeout=120s'],
      undefined,
      130_000
    );
    this.logger.info(`Sandbox pod ${podName} is Ready`);
  }

  /**
   * List current sandbox pods with basic status. Returns [] on any failure
   * (kubectl missing, no cluster, ...).
   */
  async list(): Promise<SandboxInfo[]> {
    try {
      const out = await this.kubectl.run(
        ['get', 'pods', '--selector', 'app=opencode-sandbox', '-o', 'json'],
        undefined,
        15_000
      );
      const parsed = JSON.parse(out) as {
        items?: Array<{
          metadata?: { name?: string; creationTimestamp?: string };
          status?: { phase?: string; containerStatuses?: Array<{ ready?: boolean }> };
        }>;
      };
      return (parsed.items ?? []).map((p) => ({
        name: p.metadata?.name ?? 'unknown',
        phase: p.status?.phase ?? 'Unknown',
        ready: Boolean(p.status?.containerStatuses?.every((c) => c.ready)),
        createdAt: p.metadata?.creationTimestamp,
      }));
    } catch (e) {
      this.logger.warn(`Failed to list sandbox pods: ${(e as Error).message}`);
      return [];
    }
  }

  /**
   * Delete any sandbox pods left over from a previous process. Per-turn pods are
   * kept warm (Model C) and reaped by the registry, but that in-memory state is
   * lost if the process is killed (e.g. a dev hot-reload). This startup sweep
   * reaps such orphans so they don't accumulate.
   */
  async sweepOrphans(): Promise<void> {
    try {
      await this.kubectl.run(
        [
          'delete',
          'pod',
          '--selector',
          'app=opencode-sandbox',
          '--ignore-not-found',
          '--grace-period=5',
        ],
        undefined,
        60_000
      );
    } catch (e) {
      this.logger.warn(`Failed to sweep orphaned sandbox pods: ${(e as Error).message}`);
    }
  }

  /**
   * Gather cluster/context metadata for the Sandboxes inspector. Best-effort:
   * any sub-lookup that fails is omitted rather than failing the whole call.
   */
  async getMetadata(): Promise<SandboxProviderMetadata> {
    const meta: SandboxProviderMetadata = {
      provider: this.id,
      environment: this.config.kubeContext,
      namespace: this.config.namespace,
      image: this.config.image,
      isLocal: /kind|minikube|docker-desktop|orbstack|rancher-desktop|k3d/i.test(
        this.config.kubeContext
      ),
    };

    try {
      const out = await this.kubectl.run(['version', '-o', 'json'], undefined, 10_000);
      const parsed = JSON.parse(out) as {
        clientVersion?: { gitVersion?: string };
        serverVersion?: { gitVersion?: string };
      };
      meta.clientVersion = parsed.clientVersion?.gitVersion;
      meta.serverVersion = parsed.serverVersion?.gitVersion;
    } catch (e) {
      meta.error = (e as Error).message;
    }

    try {
      const url = await this.kubectl.run(
        ['config', 'view', '--minify', '-o', 'jsonpath={.clusters[0].cluster.server}'],
        undefined,
        10_000
      );
      if (url.trim()) meta.serverUrl = url.trim();
    } catch {
      // ignore
    }

    try {
      const nodesOut = await this.kubectl.run(
        ['get', 'nodes', '-o', 'jsonpath={.items[*].metadata.name}'],
        undefined,
        10_000
      );
      const nodes = nodesOut.trim().split(/\s+/).filter(Boolean);
      if (nodes.length) meta.nodes = nodes;
    } catch {
      // ignore
    }

    return meta;
  }
}
