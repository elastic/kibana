/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (Track 7.A). MAIN side of the alerting class pool.
 * - Task Manager keeps polling/claiming/leases/result persistence on main.
 * - For `alerting:.es-query` and `actions:.index` the research TM seam swaps the runner for a stub
 *   that dispatches the task to the kit ExecutionHost (`alerting` class, thread or process).
 * - The isolate boots the real plugin set (island.ts); its async bridges land here and are served
 *   by main's REAL Core/plugin services (security/ESO/SO wrappers preserved).
 * Toggled at runtime (mode main|offmain) so A/B windows share one boot.
 */

import { performance } from 'perf_hooks';
import type { CoreStart, KibanaRequest, Logger, PluginInitializerContext } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  markCollateralLoss,
  registerExecutionClass,
  researchDefinitionMeta,
} from '@kbn/task-manager-plugin/server';
import {
  CONFIG_CAPTURE_KEY,
  CONFIG_OBSERVE_KEY,
  advanceGeneration,
  captureActiveProduct,
  classifyFlagOverrides,
  configKeyPaths,
  createReplicaWaitQueue,
  emptyPlatformReplicas,
  fingerprintSavedObjectType,
  replicaFingerprint,
  taskManagerExecutionContext,
  toPlainConfig,
} from '../capability_kit/worker_core';
import type { PlatformReplicas } from '../capability_kit/worker_core';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { captureResearchEsCapability } from '@kbn/core-elasticsearch-client-server-internal';
import { ExecutionHost, ModuleRegistry } from '../capability_kit';
import type { Binding, CodecInput, Crossing, Outcome } from '../capability_kit';
import { decodeFakeRequest, encodeFakeRequest } from './request_codec';
import type { FakeRequestDescriptor } from './request_codec';
import { decodeRunResult, decodeTaskError } from './task_codec';
import type { WireRunResult, WireTaskError } from './task_codec';
import type { IslandSnapshot } from './snapshot';
import { toData } from './isolate/bridge';

export const OFFMAIN_TASK_TYPES = new Set(['alerting:.es-query', 'actions:.index']);
const WORKLOAD_CLASS = 'alerting';

type Obj = Record<string, unknown>;
type AnyFn = (...args: unknown[]) => unknown;

export interface T7aDeps {
  readonly core: CoreStart;
  readonly taskManager: TaskManagerStartContract;
  readonly encryptedSavedObjects?: { getClient: (o?: Obj) => Obj };
  readonly spaces?: { spacesService: Obj };
  readonly security?: { authz: Obj };
  readonly maintenanceWindows?: {
    getMaintenanceWindowClientWithoutAuth: (r: KibanaRequest) => Obj;
  };
  readonly licensing?: {
    license$: {
      subscribe: (fn: (l: { toJSON: () => Obj }) => void) => { unsubscribe: () => void };
    };
  };
  readonly features?: { getKibanaFeatures?: () => unknown[] };
}

/** Latest core status observed on main. Plugins only receive this during setup. */
export interface PlatformStatusSource {
  elasticsearch: string;
  savedObjects: string;
  overall: string;
  generation: number;
}

export interface T7aConfig {
  readonly mode: 'main' | 'offmain';
  readonly transport: 'thread' | 'process';
  readonly slots: number;
  readonly concurrency: number;
  readonly abortGraceMs: number;
  readonly deadlineMs: number;
  /** D: isolate-local SO repository + co-located ESO (else async SO/ESO bridges to main). */
  readonly localSo: boolean;
}

interface EdgeAgg {
  calls: number;
  bytesIn: number;
  bytesOut: number;
  handlerMs: number;
  lever: string;
  generic: boolean;
}

const asBinding = (handler: (op: string, args: Obj) => Promise<unknown>): Binding => ({
  lever: 'capability_bundle',
  handler: async (operation, args) => {
    // Errors are thrown: kit 0.1.4 typed error codecs rebuild Boom / SO helper errors.
    return toData(await handler(operation, (args ?? {}) as Obj));
  },
});

/** MAIN-side controller for the alerting class pool. */
export class T7aController {
  private config: T7aConfig = {
    mode: 'main',
    transport: 'thread',
    slots: 1,
    concurrency: 10,
    abortGraceMs: 2000,
    deadlineMs: 10 * 60_000,
    localSo: false,
  };
  private host?: ExecutionHost;
  private readonly registry: ModuleRegistry;
  private readonly entry: string;
  private readonly edges = new Map<string, EdgeAgg>();
  private readonly outcomes = new Map<string, number>();
  private readonly runs: Obj[] = [];
  private snapshot?: IslandSnapshot;
  private license?: Obj;
  private licenseGeneration = 0;
  private probeFlag: boolean | undefined;
  private flagsState = { hash: '', generation: 1 };
  private featuresState = { hash: '', generation: 1 };
  private pricingState = { hash: '', generation: 1 };
  private cachedFlags = classifyFlagOverrides(undefined);
  private featureList: unknown[] = [];
  private readonly replicaQueue = createReplicaWaitQueue();
  private configKeyCount = 0;
  private configErrors: string[] = [];
  private readonly forwarded = { log: 0, audit: 0, analytics: 0 };
  private esCapability?: Obj;

  constructor(
    private readonly deps: T7aDeps,
    private readonly env: PluginInitializerContext['env'],
    private readonly logger: Logger,
    private readonly statusSource: PlatformStatusSource
  ) {
    this.entry = require.resolve('./isolate/entry');
    this.registry = new ModuleRegistry(new Set([this.entry]));
    for (const type of OFFMAIN_TASK_TYPES) this.registry.register(type, this.entry, 'runTask');
    deps.licensing?.license$.subscribe((license) => {
      const next = license.toJSON();
      const same = JSON.stringify(next) === JSON.stringify(this.license ?? null);
      this.license = next;
      if (!same) {
        this.licenseGeneration += 1;
        this.notifyReplicas();
      }
    });
    deps.core.featureFlags.getBooleanValue$('workerCore.liveProbe', false).subscribe((value) => {
      this.probeFlag = value;
      this.refreshFlags();
    });
    const observe = (
      globalThis as Record<symbol, (path: string) => { subscribe: (fn: () => void) => void }>
    )[CONFIG_OBSERVE_KEY];
    if (typeof observe === 'function') {
      observe('feature_flags').subscribe(() => this.refreshFlags());
    }
    registerExecutionClass({
      id: WORKLOAD_CLASS,
      taskTypes: (taskType) => OFFMAIN_TASK_TYPES.has(taskType),
      enabled: () => this.config.mode === 'offmain',
      createRunner: (taskType, context) => this.createStub(taskType, context),
    });
  }

  public getConfig(): T7aConfig {
    return this.config;
  }

  public refreshStatus(): void {
    this.notifyReplicas();
  }

  public async configure(next: Partial<T7aConfig>): Promise<T7aConfig> {
    const previous = this.config;
    this.config = { ...previous, ...next };
    const hostChanged =
      previous.transport !== this.config.transport ||
      previous.slots !== this.config.slots ||
      previous.concurrency !== this.config.concurrency ||
      previous.abortGraceMs !== this.config.abortGraceMs ||
      previous.localSo !== this.config.localSo;
    if (hostChanged || this.config.mode === 'main') await this.stopHost();
    return this.config;
  }

  public async stopHost(): Promise<void> {
    const host = this.host;
    this.host = undefined;
    await host?.stop();
  }

  public stats(): Obj {
    return {
      config: this.config,
      configKeyCount: this.configKeyCount,
      configErrors: this.configErrors,
      outcomes: Object.fromEntries(this.outcomes),
      edges: Object.fromEntries(this.edges),
      runs: this.runs.slice(-5000),
    };
  }

  public resetStats(): void {
    this.edges.clear();
    this.outcomes.clear();
    this.runs.length = 0;
  }

  /** Dispatches a control phase (stats/gc/platform) to warm slots; used by memory probes. */
  public async probe(kind: 'stats' | 'gc' | 'boot' | 'coldstart' | 'platform' | 'platform-watch'): Promise<Obj> {
    if (kind === 'platform-watch') {
      const outcome: Outcome = await this.getHost().run(
        this.runOptions(
          'alerting:.es-query',
          { phase: 'platform-watch', taskType: 'platform-watch', taskInstance: {} },
          'default',
          undefined
        )
      );
      return outcome.status === 'failure'
        ? { status: 'failure', error: `${outcome.error.name}: ${outcome.error.message}` }
        : (outcome as unknown as Obj);
    }
    if (kind === 'platform') return this.platformProbe();
    if (kind === 'coldstart') {
      await this.stopHost();
      const t0 = performance.now();
      const result = await this.probe('boot');
      return { ...result, coldStartMs: performance.now() - t0, transport: this.config.transport };
    }
    const outcome: Outcome = await this.getHost().run(
      this.runOptions(
        'alerting:.es-query',
        kind === 'boot'
          ? { phase: 'boot', taskType: 'boot', taskInstance: {} }
          : { phase: 'stats', taskType: kind, taskInstance: {} },
        'default',
        undefined
      )
    );
    return outcome.status === 'failure'
      ? { status: 'failure', error: `${outcome.error.name}: ${outcome.error.message}` }
      : (outcome as unknown as Obj);
  }

  private getHost(): ExecutionHost {
    if (!this.host) {
      this.host = new ExecutionHost(this.registry, {
        transport: this.config.transport,
        slotsPerClass: this.config.slots,
        concurrencyPerClass: { [WORKLOAD_CLASS]: this.config.concurrency },
        maxQueuePerClass: 1000,
        abortGraceMs: this.config.abortGraceMs,
        onCrossing: (crossing) => this.recordCrossing(crossing),
      });
    }
    return this.host;
  }

  private recordCrossing(crossing: Crossing): void {
    const agg = this.edges.get(crossing.edge) ?? {
      calls: 0,
      bytesIn: 0,
      bytesOut: 0,
      handlerMs: 0,
      lever: crossing.lever,
      generic: crossing.generic,
    };
    if (crossing.direction === 'isolate_to_host') {
      agg.calls++;
      agg.bytesIn += crossing.bytes;
    } else {
      agg.bytesOut += crossing.bytes;
      agg.handlerMs += crossing.durationMs;
    }
    this.edges.set(crossing.edge, agg);
  }

  private buildSnapshot(): IslandSnapshot {
    if (this.snapshot) return this.snapshot;
    const { core, security } = this.deps;
    const fake = kibanaRequestFactory({ headers: {} });
    const authz = security?.authz as
      | { mode?: { useRbacForRequest: (r: KibanaRequest) => boolean } }
      | undefined;
    const captured = captureEffectiveConfig();
    this.configKeyCount = captured.keyPaths.length;
    this.configErrors = captured.errors;
    this.snapshot = {
      kibanaVersion: this.env.packageInfo.version,
      buildFlavor: this.env.packageInfo.buildFlavor,
      buildNum: this.env.packageInfo.buildNum,
      buildSha: this.env.packageInfo.buildSha,
      instanceUuid: this.env.instanceUuid,
      dist: this.env.packageInfo.dist,
      dev: this.env.mode.dev,
      basePath: {
        serverBasePath: core.http.basePath.serverBasePath,
        publicBaseUrl: core.http.basePath.publicBaseUrl,
      },
      license: this.license ?? {},
      allIndices: core.savedObjects.getAllIndices(),
      defaultIndex: core.savedObjects.getDefaultIndex(),
      locatorIds: ['DISCOVER_APP_LOCATOR'],
      uiamEnabled: Boolean(core.security.authc.apiKeys.uiam),
      securityEnabled: Boolean(security),
      useRbacForFakeRequest: authz?.mode?.useRbacForRequest(fake) ?? false,
      taskManagerIndex: '.kibana_task_manager',
      rawConfig: {},
      effectiveConfig: captured.effectiveConfig,
      replicas: this.replicas(),
      readiness: this.readinessToken(),
      taskDefinitionMeta: [...OFFMAIN_TASK_TYPES]
        .map((type) => researchDefinitionMeta(type))
        .filter((meta): meta is NonNullable<typeof meta> => Boolean(meta)),
    };
    return this.snapshot;
  }

  private refreshFlags(): void {
    const flags = classifyFlagOverrides(readResearchConfig('feature_flags'));
    if (this.probeFlag !== undefined) flags.booleans['workerCore.liveProbe'] = this.probeFlag;
    const next = advanceGeneration(this.flagsState.hash, this.flagsState.generation, flags);
    const changed = next.hash !== this.flagsState.hash && this.flagsState.hash !== '';
    this.flagsState = next;
    this.cachedFlags = flags;
    if (changed) this.notifyReplicas();
  }

  private featureSnapshot(): unknown[] {
    let list: unknown[] = [];
    try {
      list = JSON.parse(JSON.stringify(this.deps.features?.getKibanaFeatures?.() ?? [])) as unknown[];
    } catch (error) {
      this.configErrors = [...this.configErrors, `features: ${(error as Error).name ?? 'Error'}`];
      list = this.featureList;
    }
    const next = advanceGeneration(this.featuresState.hash, this.featuresState.generation, list);
    if (next.hash !== this.featuresState.hash) {
      const changed = this.featuresState.hash !== '';
      this.featuresState = next;
      this.featureList = list;
      if (changed) this.snapshot = undefined;
    }
    return this.featureList;
  }

  private pricingReplica(): PlatformReplicas['pricing'] {
    const value = {
      available: {},
      activeProduct: captureActiveProduct(
        (
          this.deps.core.pricing as { getActiveProduct?: () => unknown }
        ).getActiveProduct?.()
      ),
    };
    const next = advanceGeneration(this.pricingState.hash, this.pricingState.generation, value);
    if (next.hash !== this.pricingState.hash && this.pricingState.hash !== '') this.snapshot = undefined;
    this.pricingState = next;
    return { generation: next.generation, value };
  }

  private replicas(_unused?: unknown): PlatformReplicas {
    return {
      license: { generation: Math.max(this.licenseGeneration, 1), value: this.license ?? {} },
      featureFlags: { generation: this.flagsState.generation, value: this.cachedFlags },
      pricing: this.pricingReplica(),
      status: {
        generation: this.statusSource.generation,
        value: {
          elasticsearch: this.statusSource.elasticsearch,
          savedObjects: this.statusSource.savedObjects,
          overall: this.statusSource.overall,
        },
      },
      features: { generation: this.featuresState.generation, value: { kibana: this.featureSnapshot() } },
    };
  }

  private notifyReplicas(): void {
    this.snapshot = undefined;
    const snapshot = this.buildSnapshot();
    const replicas = snapshot.replicas;
    if (!replicas) return;
    this.replicaQueue.publish(
      replicaFingerprint({
        license: replicas.license.generation,
        featureFlags: replicas.featureFlags.generation,
        pricing: replicas.pricing.generation,
        status: replicas.status.generation,
        features: replicas.features.generation,
      })
    );
    if (!this.host || this.config.mode !== 'offmain') return;
    void this.getHost()
      .run(
        this.runOptions(
          'alerting:.es-query',
          { phase: 'replicas', taskType: 'replicas', taskInstance: {} },
          'default',
          undefined
        )
      )
      .catch(() => undefined);
  }

  private waitForReplicaChange(seen: string, signal?: AbortSignal): Promise<PlatformReplicas> {
    const current = this.buildSnapshot().replicas;
    if (!current) return Promise.resolve(emptyPlatformReplicas());
    const fingerprint = replicaFingerprint({
      license: current.license.generation,
      featureFlags: current.featureFlags.generation,
      pricing: current.pricing.generation,
      status: current.status.generation,
      features: current.features.generation,
    });
    if (fingerprint !== seen || signal?.aborted) return Promise.resolve(current);
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', finish);
        resolve(this.buildSnapshot().replicas ?? current);
      };
      const timer = setTimeout(finish, 30_000);
      signal?.addEventListener('abort', finish, { once: true });
      void this.replicaQueue.wait(seen).then(finish);
    });
  }

  private async platformProbe(): Promise<Obj> {
    const before = { ...this.forwarded };
    const token = `wc-${Date.now().toString(36)}`;
    const outcome: Outcome = await this.getHost().run(
      this.runOptions(
        'alerting:.es-query',
        {
          phase: 'platform',
          taskType: 'platform',
          taskInstance: {},
          token,
          executionContext: { type: 'task manager', name: 'worker-core-platform', id: token },
        },
        'default',
        undefined
      )
    );
    if (outcome.status === 'failure') {
      return { status: 'failure', error: `${outcome.error.name}: ${outcome.error.message}` };
    }
    if (outcome.status !== 'success') return { status: outcome.status };
    const snapshot = this.snapshot;
    const replicas = snapshot?.replicas;
    return {
      status: 'success',
      token,
      configKeyCount: this.configKeyCount,
      configPlugins: Object.keys(snapshot?.effectiveConfig ?? {}),
      configErrors: this.configErrors,
      replicaGenerations: {
        license: replicas?.license.generation ?? 0,
        featureFlags: replicas?.featureFlags.generation ?? 0,
        pricing: replicas?.pricing.generation ?? 0,
        status: replicas?.status.generation ?? 0,
        features: replicas?.features.generation ?? 0,
      },
      probeFlag: replicas?.featureFlags.value.booleans['workerCore.liveProbe'] ?? null,
      activeProduct: replicas?.pricing.value.activeProduct ?? null,
      featureCount: replicas?.features.value.kibana.length ?? 0,
      forwarded: {
        log: this.forwarded.log - before.log,
        audit: this.forwarded.audit - before.audit,
        analytics: this.forwarded.analytics - before.analytics,
      },
      observation: outcome.value,
    };
  }

  private readinessToken(): IslandSnapshot['readiness'] {
    const registry = (
      this.deps.core.savedObjects as {
        getTypeRegistry?: () => {
          getAllTypes: () => Array<{
            name: string;
            mappings?: unknown;
            namespaceType?: unknown;
            hidden?: boolean;
            indexPattern?: string;
          }>;
        };
      }
    ).getTypeRegistry?.();
    const fingerprints: Record<string, string> = {};
    if (registry) {
      for (const type of registry.getAllTypes()) fingerprints[type.name] = fingerprintSavedObjectType(type);
    }
    return { generation: 1, fingerprints };
  }

  private capabilities(): Record<string, Binding> {
    const { core, taskManager, encryptedSavedObjects, spaces, security, maintenanceWindows } =
      this.deps;
    const soClient = (args: Obj): Obj => {
      const target = args.target as string;
      let client: Obj;
      if (target === 'internal') {
        client = core.savedObjects.createInternalRepository(
          args.types as string[]
        ) as unknown as Obj;
      } else if (target === 'unsafeInternal') {
        client = core.savedObjects.getUnsafeInternalClient(args.options as never) as unknown as Obj;
      } else if (target === 'scoped') {
        client = core.savedObjects.getScopedClient(
          decodeFakeRequest(args.request as FakeRequestDescriptor),
          args.options as never
        ) as unknown as Obj;
      } else throw new Error('t7a so: bad target');
      if (typeof args.namespace === 'string')
        client = (client.asScopedToNamespace as AnyFn)(args.namespace) as Obj;
      return client;
    };
    const callArgs = (args: Obj) => (args.args as unknown[] | undefined) ?? [];
    return {
      log: asBinding(async (op, args) => {
        if (op !== 'write') throw new Error('t7a log: op not allowlisted');
        const message = `[worker-core][${String(args.context ?? '')}] ${String(args.message ?? '')}`;
        const level = String(args.level ?? 'info');
        if (level === 'error' || level === 'fatal') this.logger.error(message);
        else if (level === 'warn') this.logger.warn(message);
        else if (level === 'debug' || level === 'trace') this.logger.debug(message);
        else this.logger.info(message);
        this.forwarded.log += 1;
        return { ok: true };
      }),
      audit: asBinding(async (op, args) => {
        if (op !== 'write') throw new Error('t7a audit: op not allowlisted');
        const audit = core.security.audit as { withoutRequest?: { log?: (event: unknown) => void } };
        if (audit.withoutRequest?.log) audit.withoutRequest.log(args);
        else this.logger.info('[worker-core][audit] event forwarded');
        this.forwarded.audit += 1;
        return { ok: true };
      }),
      analytics: asBinding(async (op, args) => {
        if (op !== 'write') throw new Error('t7a analytics: op not allowlisted');
        const report = (core.analytics as { reportEvent?: (event: unknown) => void }).reportEvent;
        if (report) report(args);
        this.forwarded.analytics += 1;
        return { ok: true };
      }),
      replica: {
        lever: 'capability_bundle',
        handler: async (operation, args, _bundle, context) => {
          const record = (args ?? {}) as Obj;
          if (operation === 'pricing') return toData(core.pricing.isFeatureAvailable(String(record.featureId)));
          if (operation === 'wait') {
            return toData(
              await this.waitForReplicaChange(String(record.fingerprint ?? ''), context?.signal)
            );
          }
          if (operation !== 'featureFlag') throw new Error('t7a replica: op not allowlisted');
          const flags = core.featureFlags;
          if (record.kind === 'string') {
            return toData(flags.getStringValue(String(record.key), String(record.fallback ?? '')));
          }
          if (record.kind === 'number') {
            return toData(flags.getNumberValue(String(record.key), Number(record.fallback ?? 0)));
          }
          return toData(flags.getBooleanValue(String(record.key), Boolean(record.fallback)));
        },
      },
      so: asBinding(async (op, args) => {
        const client = soClient(args);
        const method = client[op] as AnyFn | undefined;
        if (typeof method !== 'function') throw new Error(`t7a so: method ${op} not available`);
        return method.apply(client, callArgs(args));
      }),
      eso: asBinding(async (op, args) => {
        if (op !== 'getDecryptedAsInternalUser') throw new Error('t7a eso: op not allowlisted');
        const client = encryptedSavedObjects!.getClient(args.options as Obj);
        return (client.getDecryptedAsInternalUser as AnyFn)(args.type, args.id, args.opts);
      }),
      tm: asBinding(async (op, args) => {
        if (!['bulkSchedule', 'schedule', 'aggregate', 'fetch', 'get'].includes(op))
          throw new Error('t7a tm: op not allowlisted');
        const list = args as unknown as unknown[];
        return (taskManager as unknown as Record<string, AnyFn>)[op].apply(taskManager, list);
      }),
      uiSettings: asBinding(async (op, args) => {
        const client = core.uiSettings.asScopedToClient(soClient(args) as never) as unknown as Obj;
        return (client[op] as AnyFn).apply(client, callArgs(args));
      }),
      spaces: asBinding(async (op, args) => {
        const request = decodeFakeRequest(args.request as FakeRequestDescriptor);
        const service = spaces!.spacesService as Obj;
        if (op === 'getActiveSpace') return (service.getActiveSpace as AnyFn)(request);
        if (op === 'get')
          return ((service.createSpacesClient as AnyFn)(request) as Obj & { get: AnyFn }).get(
            args.id
          );
        throw new Error('t7a spaces: op not allowlisted');
      }),
      security: asBinding(async (op, args) => {
        const request = decodeFakeRequest(args.request as FakeRequestDescriptor);
        const authz = security!.authz as Obj;
        if (op === 'checkPrivilegesDynamically')
          return ((authz.checkPrivilegesDynamicallyWithRequest as AnyFn)(request) as AnyFn)(
            args.privileges,
            args.opts
          );
        const scoped = (authz.checkPrivilegesWithRequest as AnyFn)(request) as Record<
          string,
          AnyFn
        >;
        if (op === 'checkPrivilegesAtSpace')
          return scoped.atSpace(args.spaceId, args.privileges, args.opts);
        if (op === 'checkPrivilegesAtSpaces')
          return scoped.atSpaces(args.spaceIds, args.privileges, args.opts);
        if (op === 'checkPrivilegesGlobally') return scoped.globally(args.privileges, args.opts);
        throw new Error('t7a security: op not allowlisted');
      }),
      mw: asBinding(async (op, args) => {
        const client = maintenanceWindows!.getMaintenanceWindowClientWithoutAuth(
          decodeFakeRequest(args.request as FakeRequestDescriptor)
        );
        return (client[op] as AnyFn).apply(client, callArgs(args));
      }),
    };
  }

  private runOptions(taskType: string, input: Obj, space: string, signal: AbortSignal | undefined) {
    const fake = kibanaRequestFactory({ headers: {} });
    return {
      workloadClass: WORKLOAD_CLASS,
      moduleId: taskType,
      input: input as CodecInput,
      principal: `task:${taskType}`,
      space,
      capabilities: this.capabilities(),
      data: {
        snapshot: this.buildSnapshot(),
        localSo: this.config.localSo,
        elasticsearch: (this.esCapability ??= captureResearchEsCapability(
          this.deps.core.elasticsearch.client as never,
          fake,
          'internal'
        ) as unknown as Obj),
      } as unknown as CodecInput,
      deadlineMs: this.config.deadlineMs,
      signal,
    };
  }

  private createStub(taskType: string, context: RunContext) {
    const { taskInstance } = context;
    const space = String((taskInstance.params as Obj | undefined)?.spaceId ?? 'default');
    const baseInput = {
      taskType,
      taskInstance: taskInstance as unknown as Obj,
      executionUuid: context.executionUuid,
      executionContext: taskManagerExecutionContext(
        taskType,
        String((taskInstance as Obj).id ?? '')
      ),
      ...(context.fakeRequest ? { fakeRequest: encodeFakeRequest(context.fakeRequest) } : {}),
    };
    const dispatch = async (phase: 'run' | 'cleanup') => {
      const t0 = performance.now();
      const outcome = await this.getHost().run(
        this.runOptions(taskType, { ...baseInput, phase }, space, context.signal)
      );
      const key = `${taskType}/${phase}/${outcome.status}`;
      this.outcomes.set(key, (this.outcomes.get(key) ?? 0) + 1);
      const value = (outcome.status === 'success' ? outcome.value : undefined) as Obj | undefined;
      this.runs.push({
        taskType,
        phase,
        status: outcome.status,
        dispatchMs: performance.now() - t0,
        runMs: value?.runMs,
        coldBootMs: value?.coldBootMs,
        heapUsed: outcome.status === 'success' ? outcome.heapUsed : undefined,
        rss: outcome.status === 'success' ? outcome.rss : undefined,
        at: Date.now(),
        ...(outcome.status === 'terminated' ? { reason: outcome.reason } : {}),
      });
      if (outcome.status === 'failure') throw outcome.error;
      if (outcome.status === 'terminated') {
        this.logger.warn(`t7a: ${taskType} ${phase} terminated in isolate (${outcome.reason})`);
        const error = new Error(
          `t7a: ${taskType} ${phase} terminated in isolate (${outcome.reason})`
        );
        if (outcome.collateral) throw markCollateralLoss(error);
        throw error;
      }
      const customFields = value?.customFields as Obj | undefined;
      if (customFields && Object.keys(customFields).length)
        context.setCustomTaskRunEventFields?.(customFields as never);
      if (value?.thrown) throw decodeTaskError(value.thrown as WireTaskError);
      return value;
    };
    return {
      run: async () => {
        const value = await dispatch('run');
        return decodeRunResult((value?.wire ?? {}) as WireRunResult) as never;
      },
      // TM's cancel wrapper aborts context.signal → kit cooperative cancel → isolate runner.cancel().
      cancel: async () => undefined,
      ...(taskType.startsWith('actions:')
        ? {
            cleanup: async () => {
              await dispatch('cleanup');
            },
          }
        : {}),
    };
  }
}

const PLUGIN_CONFIG_PATHS: Record<string, string> = {
  eventLog: 'xpack.eventLog',
  actions: 'xpack.actions',
  stackConnectors: 'xpack.stack_connectors',
  alerting: 'xpack.alerting',
  stackAlerts: 'xpack.stack_alerts',
  encryptedSavedObjects: 'xpack.encryptedSavedObjects',
};

/** Reads one config path. Failures become an empty capture, never a logged value. */
const readResearchConfig = (path: string): unknown => {
  const at = (globalThis as Record<symbol, (configPath: string) => unknown>)[CONFIG_CAPTURE_KEY];
  if (typeof at !== 'function') return undefined;
  try {
    return at(path);
  } catch {
    return undefined;
  }
};

/** Reads main's effective plugin config. Returns key paths only to callers that log. */
const captureEffectiveConfig = (): {
  effectiveConfig: Record<string, Record<string, unknown>>;
  keyPaths: string[];
  errors: string[];
} => {
  const at = (globalThis as Record<symbol, (path: string) => unknown>)[CONFIG_CAPTURE_KEY];
  const effectiveConfig: Record<string, Record<string, unknown>> = {};
  const errors: string[] = [];
  if (typeof at !== 'function') {
    return { effectiveConfig, keyPaths: [], errors: ['config capture unavailable'] };
  }
  for (const [id, path] of Object.entries(PLUGIN_CONFIG_PATHS)) {
    try {
      const plain = toPlainConfig(at(path));
      effectiveConfig[id] =
        plain && typeof plain === 'object' && !Array.isArray(plain)
          ? (plain as Record<string, unknown>)
          : {};
    } catch (error) {
      errors.push(`${id}: ${(error as Error).name ?? 'Error'}`);
    }
  }
  return { effectiveConfig, keyPaths: configKeyPaths(effectiveConfig), errors };
};
