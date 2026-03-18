/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import { POD_READY_TIMEOUT_S, POD_READY_POLL_INTERVAL_MS } from './constants';

const MINIKUBE_CPUS = 4;
const MINIKUBE_MEMORY = '8g';

export async function ensureMinikube(log: ToolingLog): Promise<void> {
  try {
    const { stdout } = await execa('minikube', ['status', '--format', '{{.Host}}']);
    if (stdout.trim() === 'Running') {
      log.info('minikube is already running');
      return;
    }
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'ENOENT') {
      throw new Error('minikube is not installed. Please install minikube');
    }
    // `minikube status` exits non-zero when the cluster is stopped or doesn't exist
  }

  log.info(
    `Starting minikube (--cpus=${MINIKUBE_CPUS} --memory=${MINIKUBE_MEMORY}) — this may take a minute...`
  );
  await execa('minikube', ['start', `--cpus=${MINIKUBE_CPUS}`, `--memory=${MINIKUBE_MEMORY}`], {
    stdio: 'inherit',
  });
  log.info('minikube started');
}

export async function waitForPodsReady(log: ToolingLog, namespace: string): Promise<void> {
  log.info(`Waiting for pods in namespace "${namespace}" to be ready...`);
  const deadline = Date.now() + POD_READY_TIMEOUT_S * 1000;

  while (Date.now() < deadline) {
    try {
      const { stdout: phasesOut } = await execa.command(
        `kubectl get pods -n ${namespace} -o jsonpath='{.items[*].status.phase}'`
      );
      const phases = phasesOut.replace(/'/g, '').trim().split(' ').filter(Boolean);

      if (phases.length > 0 && phases.every((p) => p === 'Running')) {
        const { stdout: readyOut } = await execa.command(
          `kubectl get pods -n ${namespace} -o jsonpath='{.items[*].status.containerStatuses[*].ready}'`
        );
        const readyStates = readyOut.replace(/'/g, '').trim().split(' ').filter(Boolean);

        if (readyStates.length > 0 && readyStates.every((r) => r === 'true')) {
          log.info('All pods ready');
          return;
        }
      }
    } catch {
      // pods may not exist yet
    }
    await new Promise((resolve) => setTimeout(resolve, POD_READY_POLL_INTERVAL_MS));
  }

  throw new Error(`Timeout (${POD_READY_TIMEOUT_S}s) waiting for pods to be ready`);
}
