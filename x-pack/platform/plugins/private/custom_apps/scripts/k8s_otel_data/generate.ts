/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import {
  CLUSTER_DATASET,
  KUBELET_DATASET,
  alertIndexName,
  logsIndex,
  metricsIndex,
} from './config';
import {
  alertStatusDoc,
  containerStateDoc,
  deploymentStateDoc,
  logDoc,
  nodeMetricsDoc,
  podMetricsDoc,
  volumeMetricsDoc,
} from './docs';
import type { BulkDoc, PodSample } from './docs';
import type { Indexer } from './indexer';
import { evaluateHealth, evaluateScenario } from './scenarios';
import type { PodHealth, ScenarioEffect } from './scenarios';
import { clamp, diurnal, noise, weekly, wander } from './signals';
import type { Pod, Topology } from './topology';

const GIB = 1024 ** 3;
/**
 * `k8sclusterreceiver` polls the API server far less often than kubelet scrapes
 * metrics, and deployment replica counts barely move between scrapes. Emitting
 * state documents on a 15 minute cadence matches that and removes about two thirds
 * of the corpus.
 */
const STATE_CADENCE_MS = 900_000;

const INFO_MESSAGES = [
  'Handled request in {ms}ms',
  'Reconcile loop completed, 0 changes applied',
  'Cache refreshed, {n} entries loaded',
  'Health probe succeeded',
  'Published {n} messages to topic orders.v2',
];

const HEALTHY_ERROR_MESSAGES = [
  'Upstream returned 503, retrying with backoff',
  'Dropped 1 message: payload failed schema validation',
  'Connection reset by peer while reading response',
];

export interface GenerateOptions {
  topology: Topology;
  indexer: Indexer;
  startMs: number;
  endMs: number;
  intervalMs: number;
  namespace: string;
  seed: number;
  logsPerMinute: number;
  includeLogs: boolean;
  includeVolumes: boolean;
  includeContainers: boolean;
  log: ToolingLog;
}

interface PodReading {
  sample: PodSample;
  effect: ScenarioEffect;
}

/**
 * Four multiplicative layers — a per-pod personality, the namespace's character, the
 * time of day and week, and whatever is currently wrong with the pod.
 */
const readPod = (
  pod: Pod,
  timeMs: number,
  step: number,
  context: { startMs: number; endMs: number; intervalMs: number }
): PodReading => {
  const effect = evaluateScenario(pod, timeMs, context);
  const dayNight = 1 + (diurnal(timeMs) - 1) * pod.namespace.diurnal;
  const week = 1 + (weekly(timeMs) - 1) * pod.namespace.diurnal;

  const cpuUtilisation = clamp(
    pod.cpuBase * dayNight * week * wander(`cpu:${pod.uid}`, step) * effect.cpuMultiplier,
    0.002,
    1.15
  );
  // Memory follows the clock much more weakly than CPU does; a leak or a restart is
  // what actually moves it.
  const memoryUtilisation = clamp(
    pod.memBase *
      (1 + (dayNight - 1) * 0.3) *
      wander(`mem:${pod.uid}`, step, 0.08) *
      effect.memoryMultiplier,
    0.01,
    1.02
  );
  const memoryWorkingSet = memoryUtilisation * pod.memLimit;

  return {
    effect,
    sample: {
      cpuUsage: cpuUtilisation * pod.cpuLimit,
      cpuLimitUtilisation: cpuUtilisation,
      cpuNodeUtilisation: (cpuUtilisation * pod.cpuLimit) / pod.node.cpuCores,
      memoryWorkingSet,
      memoryRss: memoryWorkingSet * 0.84,
      memoryLimitUtilisation: memoryUtilisation,
      networkIo:
        pod.networkBase * dayNight * wander(`net:${pod.uid}`, step) * effect.networkMultiplier,
      restarts: effect.restarts,
    },
  };
};

export const generate = async ({
  topology,
  indexer,
  startMs,
  endMs,
  intervalMs,
  namespace,
  seed,
  logsPerMinute,
  includeLogs,
  includeVolumes,
  includeContainers,
  log,
}: GenerateOptions): Promise<void> => {
  const kubeletIndex = metricsIndex(KUBELET_DATASET, namespace);
  const clusterIndex = metricsIndex(CLUSTER_DATASET, namespace);
  const logIndex = logsIndex(namespace);
  const context = { startMs, endMs, intervalMs };

  const health = new Map<string, PodHealth>(
    topology.pods.map((pod) => [pod.uid, evaluateHealth(pod, seed)])
  );

  const stateEvery = Math.max(1, Math.round(STATE_CADENCE_MS / intervalMs));
  const totalSteps = Math.floor((endMs - startMs) / intervalMs) + 1;
  const logsPerInterval = Math.max(1, Math.round((logsPerMinute * intervalMs) / 60_000));

  let lastReported = 0;

  for (let step = 0; step < totalSteps; step++) {
    const timeMs = startMs + step * intervalMs;
    const nodeTally = new Map<
      string,
      { cpu: number; memory: number; network: number; pods: number }
    >();
    const deploymentDown = new Map<string, number>();
    const readings: Array<{ pod: Pod; reading: PodReading }> = [];

    for (const pod of topology.pods) {
      const reading = readPod(pod, timeMs, step, context);
      readings.push({ pod, reading });

      const podStatus = health.get(pod.uid)!.status;
      indexer.add(podMetricsDoc(pod, reading.sample, timeMs, podStatus, kubeletIndex, namespace));

      const tally = nodeTally.get(pod.node.name) ?? { cpu: 0, memory: 0, network: 0, pods: 0 };
      tally.cpu += reading.sample.cpuUsage;
      tally.memory += reading.sample.memoryWorkingSet;
      tally.network += reading.sample.networkIo;
      tally.pods += 1;
      nodeTally.set(pod.node.name, tally);

      if (reading.effect.down) {
        deploymentDown.set(pod.deployment.uid, (deploymentDown.get(pod.deployment.uid) ?? 0) + 1);
      }

      if (includeVolumes) {
        for (const volume of pod.volumes) {
          const used = clamp(0.3 + noise(`vol:${pod.uid}:${volume.name}`, step) * 0.45, 0.05, 0.95);
          indexer.add(volumeMetricsDoc(pod, volume, used, timeMs, kubeletIndex, namespace));
        }
      }

      await indexer.maybeFlush();
    }

    // Node metrics are summed from the pods actually scheduled on them plus system
    // overhead, so a node hosting a runaway pod genuinely reads hot.
    for (const node of topology.nodes) {
      const tally = nodeTally.get(node.name) ?? { cpu: 0, memory: 0, network: 0, pods: 0 };
      indexer.add(
        nodeMetricsDoc(
          node,
          {
            cpuUsage: Math.min(node.cpuCores, tally.cpu + 0.3),
            memoryWorkingSet: Math.min(node.memoryBytes, tally.memory + 1.5 * GIB),
            networkIo: tally.network,
            podCount: tally.pods,
          },
          timeMs,
          kubeletIndex,
          namespace
        )
      );
    }

    if (step % stateEvery === 0) {
      if (includeContainers) {
        for (const { pod, reading } of readings) {
          for (const container of pod.containers) {
            indexer.add(
              containerStateDoc(
                pod,
                container,
                reading.effect.restarts,
                !reading.effect.down,
                timeMs,
                clusterIndex,
                namespace
              )
            );
          }
          await indexer.maybeFlush();
        }
      }

      for (const deployment of topology.deployments) {
        const down = deploymentDown.get(deployment.uid) ?? 0;
        indexer.add(
          deploymentStateDoc(
            deployment,
            Math.max(0, deployment.desired - down),
            timeMs,
            clusterIndex,
            namespace
          )
        );
      }
    }

    if (includeLogs) {
      for (const doc of buildLogs(readings, logsPerInterval, step, timeMs, intervalMs, logIndex)) {
        indexer.add(doc);
      }
    }

    await indexer.maybeFlush();

    const percent = Math.floor(((step + 1) / totalSteps) * 100);
    if (percent >= lastReported + 10) {
      lastReported = percent;
      log.info(
        `  ${percent}% — ${indexer.stats.indexed.toLocaleString()} indexed, ` +
          `${indexer.stats.skipped.toLocaleString()} already present`
      );
    }
  }

  const alertIndex = alertIndexName(namespace);
  for (const pod of topology.pods) {
    indexer.add(alertStatusDoc(pod, health.get(pod.uid)!, endMs, alertIndex));
  }

  await indexer.drain();
};

/**
 * Picks which pods log this interval, weighted so an unhealthy pod produces a visible
 * error stream without drowning the cluster. The weights come from the same scenario
 * evaluation the metrics used, which is what keeps bursts aligned to spikes.
 */
const buildLogs = (
  readings: Array<{ pod: Pod; reading: PodReading }>,
  count: number,
  step: number,
  timeMs: number,
  intervalMs: number,
  index: string
): BulkDoc[] => {
  const cumulative: number[] = [];
  let total = 0;
  for (const { reading } of readings) {
    total += reading.effect.logWeight;
    cumulative.push(total);
  }
  if (total === 0) return [];

  const docs: BulkDoc[] = [];
  for (let line = 0; line < count; line++) {
    const target = noise(`logpick:${step}`, line) * total;
    let low = 0;
    let high = cumulative.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (cumulative[mid] < target) low = mid + 1;
      else high = mid;
    }

    const { pod, reading } = readings[low];
    const jitter = Math.floor(noise(`logtime:${step}:${line}`, 0) * intervalMs);
    const roll = noise(`logkind:${step}:${line}`, 1);
    // Keyed off the interval start, which is snapped to an absolute grid, so the
    // same seed and interval regenerate the same document ids on a later run.
    const key = `${pod.uid}:${timeMs}:${line}`;

    if (reading.effect.severity && roll < 0.75) {
      const statusCode = reading.effect.severity === 'ERROR' ? 503 : undefined;
      docs.push(
        logDoc(
          pod,
          reading.effect.severity,
          reading.effect.message!,
          statusCode,
          timeMs + jitter,
          index,
          key
        )
      );
      continue;
    }

    // Even a healthy cluster is not silent; a small share of ordinary errors keeps
    // "filter to errors" from returning only the twelve broken pods.
    if (roll > 0.94) {
      const message =
        HEALTHY_ERROR_MESSAGES[Math.floor(roll * 1000) % HEALTHY_ERROR_MESSAGES.length];
      docs.push(logDoc(pod, 'ERROR', message, 503, timeMs + jitter, index, key));
      continue;
    }

    const template = INFO_MESSAGES[Math.floor(roll * 100) % INFO_MESSAGES.length];
    const message = template
      .replace('{ms}', String(5 + Math.floor(roll * 400)))
      .replace('{n}', String(1 + Math.floor(roll * 900)));
    docs.push(logDoc(pod, 'INFO', message, 200, timeMs + jitter, index, key));
  }

  return docs;
};
