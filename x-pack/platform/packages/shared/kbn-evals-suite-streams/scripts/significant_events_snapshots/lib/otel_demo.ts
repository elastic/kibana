/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import Path from 'path';
import { POD_READY_TIMEOUT_S, POD_READY_POLL_INTERVAL_MS, OTEL_DEMO_NAMESPACE } from './constants';

const otelDemoScript = Path.join(REPO_ROOT, 'scripts', 'otel_demo.js');

interface OtelDemoHandle {
  child: execa.ExecaChildProcess;
  deployedPromise: Promise<void>;
}

export function deployOtelDemo(log: ToolingLog): OtelDemoHandle {
  log.info('Deploying OTel Demo (will stream in background)...');

  const child = execa('node', [otelDemoScript], {
    stdio: ['ignore', 'pipe', 'pipe'],
    reject: false,
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  const successMessage = 'deployed successfully';
  const timeoutMs = 10 * 60_000;

  let settled = false;
  let successSeen = false;

  let resolveDeployed!: () => void;
  let rejectDeployed!: (err: Error) => void;

  const deployedPromise = new Promise<void>((resolve, reject) => {
    resolveDeployed = resolve;
    rejectDeployed = reject;
  });

  const settleResolve = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    resolveDeployed();
  };

  const settleReject = (err: Error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    rejectDeployed(err);
  };

  const timeout: ReturnType<typeof setTimeout> = setTimeout(() => {
    settleReject(new Error(`Timed out waiting for otel_demo.js to report "${successMessage}"`));
  }, timeoutMs);

  const handleStream = (prefix: string) => {
    let remainder = '';

    return (chunk: Buffer) => {
      const text = remainder + chunk.toString();
      const parts = text.split('\n');
      remainder = parts.pop() ?? '';

      for (const line of parts.filter(Boolean)) {
        log.debug(`[${prefix}] ${line}`);
      }

      // Catch both complete lines and chunk-boundary splits
      if (!successSeen && text.includes(successMessage)) {
        successSeen = true;
        settleResolve();
      }
    };
  };

  child.stdout?.on('data', handleStream('otel-demo'));
  child.stderr?.on('data', handleStream('otel-demo:err'));

  // Reject if the process exits before emitting the success marker (even code 0)
  child.once('exit', (code, signal) => {
    if (successSeen) return;
    settleReject(
      new Error(
        `otel_demo.js exited before reporting "${successMessage}" (code=${
          code ?? 'unknown'
        }, signal=${signal ?? 'unknown'})`
      )
    );
  });

  // Reject on spawn/runtime errors
  child.once('error', (err) => {
    settleReject(err instanceof Error ? err : new Error(String(err)));
  });

  return { child, deployedPromise };
}

export async function patchScenario(log: ToolingLog, scenarioId: string): Promise<void> {
  log.info(`Patching scenario: ${scenarioId}`);
  await execa('node', [otelDemoScript, '--patch', '--scenario', scenarioId], {
    stdio: 'inherit',
  });
}

export async function teardownOtelDemo(log: ToolingLog): Promise<void> {
  log.info('Tearing down OTel Demo...');
  await execa('node', [otelDemoScript, '--teardown'], { stdio: 'inherit' });
}

export async function waitForPodsReady(log: ToolingLog): Promise<void> {
  log.info(`Waiting for pods in namespace "${OTEL_DEMO_NAMESPACE}" to be ready...`);
  const deadline = Date.now() + POD_READY_TIMEOUT_S * 1000;

  while (Date.now() < deadline) {
    try {
      const { stdout: phasesOut } = await execa.command(
        `kubectl get pods -n ${OTEL_DEMO_NAMESPACE} -o jsonpath='{.items[*].status.phase}'`
      );
      const phases = phasesOut.replace(/'/g, '').trim().split(' ').filter(Boolean);

      if (phases.length > 0 && phases.every((p) => p === 'Running')) {
        const { stdout: readyOut } = await execa.command(
          `kubectl get pods -n ${OTEL_DEMO_NAMESPACE} -o jsonpath='{.items[*].status.containerStatuses[*].ready}'`
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
