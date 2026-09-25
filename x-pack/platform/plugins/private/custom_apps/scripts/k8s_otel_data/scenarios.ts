/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clamp, intFrom, noise } from './signals';
import type { Pod } from './topology';

export type ScenarioKind =
  | 'healthy'
  | 'cpu_hot'
  | 'mem_leak'
  | 'crashloop'
  | 'noisy_network'
  | 'flapping';

export type AlertStatus = 'active' | 'clear' | 'untracked';

export interface ScenarioEffect {
  cpuMultiplier: number;
  memoryMultiplier: number;
  networkMultiplier: number;
  /** Cumulative restarts for this pod as of this instant. */
  restarts: number;
  /** True while the container is between crashes — CPU and memory read near zero. */
  down: boolean;
  /** Relative likelihood of this pod producing a log line in this interval. */
  logWeight: number;
  severity?: 'WARN' | 'ERROR' | 'FATAL';
  message?: string;
}

export interface ScenarioContext {
  startMs: number;
  endMs: number;
  intervalMs: number;
}

const HOUR = 3_600_000;

const HEALTHY: ScenarioEffect = {
  cpuMultiplier: 1,
  memoryMultiplier: 1,
  networkMultiplier: 1,
  restarts: 0,
  down: false,
  logWeight: 1,
};

/**
 * The single source of truth for what is wrong with a pod at a given instant. The
 * metric, restart-count and log generators all call this, which is what keeps an
 * error burst on the same timestamps as the CPU spike it is supposed to explain.
 */
export const evaluateScenario = (
  pod: Pod,
  timeMs: number,
  { startMs, endMs, intervalMs }: ScenarioContext
): ScenarioEffect => {
  // Every pod restarts occasionally; a flat zero across 1,000 pods looks synthetic.
  const baseRestarts = intFrom(`restarts:${pod.uid}`, 3);
  const step = Math.floor((timeMs - startMs) / intervalMs);
  const span = Math.max(endMs - startMs, intervalMs);

  switch (pod.scenario) {
    case 'cpu_hot': {
      // Ramps over three hours starting a quarter of the way in, then holds.
      const onsetMs = startMs + span * 0.25;
      const rampMs = Math.min(3 * HOUR, span * 0.35);
      if (timeMs < onsetMs) return { ...HEALTHY, restarts: baseRestarts };
      const progress = clamp((timeMs - onsetMs) / rampMs, 0, 1);
      const target = 1 / Math.max(pod.cpuBase, 0.05);
      return {
        cpuMultiplier: 1 + (target * 0.98 - 1) * progress,
        memoryMultiplier: 1 + 0.15 * progress,
        networkMultiplier: 1,
        restarts: baseRestarts,
        down: false,
        logWeight: 1 + 7 * progress,
        severity: 'ERROR',
        message: 'context deadline exceeded while calling upstream service',
      };
    }

    case 'mem_leak': {
      // A six-hour sawtooth: climb to the limit, get OOM-killed, start again.
      const cycleMs = 6 * HOUR;
      const cycle = Math.floor((timeMs - startMs) / cycleMs);
      const progress = ((timeMs - startMs) % cycleMs) / cycleMs;
      const target = 1 / Math.max(pod.memBase, 0.05);
      const justReset = progress < intervalMs / cycleMs;
      return {
        cpuMultiplier: 1,
        memoryMultiplier: justReset ? 0.12 : 1 + (target * 0.99 - 1) * progress,
        networkMultiplier: 1,
        restarts: baseRestarts + cycle,
        down: false,
        logWeight: justReset ? 9 : 1 + 3 * progress,
        severity: justReset ? 'FATAL' : progress > 0.6 ? 'WARN' : undefined,
        message: justReset
          ? 'Container killed: OOMKilled (exit code 137)'
          : 'GC pressure high: heap utilisation above 85% for 5m',
      };
    }

    case 'crashloop': {
      // Two intervals down out of every five, restarting on each cycle.
      const down = step % 5 < 2;
      return {
        cpuMultiplier: down ? 0.02 : 1.3,
        memoryMultiplier: down ? 0.05 : 1.1,
        networkMultiplier: down ? 0.01 : 1,
        restarts: baseRestarts + Math.floor(step / 5) + 1,
        down,
        logWeight: 10,
        severity: 'FATAL',
        message: 'Back-off 5m0s restarting failed container',
      };
    }

    case 'noisy_network':
      return {
        ...HEALTHY,
        networkMultiplier: 8 + noise(`noisy:${pod.uid}`, step) * 4,
        restarts: baseRestarts,
        logWeight: 6,
        severity: 'WARN',
        message: 'Outbound connection pool saturated, queuing requests',
      };

    case 'flapping': {
      const hot = step % 5 < 2;
      const target = 1 / Math.max(pod.cpuBase, 0.05);
      return {
        cpuMultiplier: hot ? target * 0.94 : 1,
        memoryMultiplier: 1,
        networkMultiplier: 1,
        // Two restarts across the whole window, at a third and two thirds through.
        restarts:
          baseRestarts +
          (timeMs > startMs + span / 3 ? 1 : 0) +
          (timeMs > startMs + (span * 2) / 3 ? 1 : 0),
        down: false,
        logWeight: hot ? 5 : 1,
        severity: hot ? 'ERROR' : undefined,
        message: 'Request latency p99 above SLO threshold',
      };
    }

    case 'healthy':
    default:
      return { ...HEALTHY, restarts: baseRestarts };
  }
};

export interface PodHealth {
  status: AlertStatus;
  activeAlerts: number;
  ruleCount: number;
  severity: 'critical' | 'warning' | 'none';
  reason: string;
}

const SCENARIO_HEALTH: Record<Exclude<ScenarioKind, 'healthy'>, Omit<PodHealth, 'status'>> = {
  cpu_hot: {
    activeAlerts: 2,
    ruleCount: 3,
    severity: 'critical',
    reason: 'CPU limit utilisation above 90% for 15m',
  },
  mem_leak: {
    activeAlerts: 2,
    ruleCount: 3,
    severity: 'critical',
    reason: 'Memory limit utilisation above 95%, container OOMKilled',
  },
  crashloop: {
    activeAlerts: 3,
    ruleCount: 3,
    severity: 'critical',
    reason: 'Container restarting repeatedly (CrashLoopBackOff)',
  },
  noisy_network: {
    activeAlerts: 1,
    ruleCount: 2,
    severity: 'warning',
    reason: 'Network egress above baseline for 30m',
  },
  flapping: {
    activeAlerts: 1,
    ruleCount: 2,
    severity: 'warning',
    reason: 'CPU utilisation crossing threshold intermittently',
  },
};

/**
 * Health is stored alongside the metrics rather than derived from them, because
 * "no alert set up" is a statement about rule coverage that no metric can express —
 * and because a pod's alert state should not change when the user moves the time
 * picker.
 */
export const evaluateHealth = (pod: Pod, seed: number): PodHealth => {
  if (pod.scenario !== 'healthy') {
    return { status: 'active', ...SCENARIO_HEALTH[pod.scenario] };
  }
  // Roughly 15% of pods have no rule covering them at all; the rest are green.
  if (noise(`${seed}:tracked:${pod.uid}`, 0) < 0.15) {
    return {
      status: 'untracked',
      activeAlerts: 0,
      ruleCount: 0,
      severity: 'none',
      reason: 'No alerting rule covers this resource',
    };
  }
  return {
    status: 'clear',
    activeAlerts: 0,
    ruleCount: 1 + intFrom(`rules:${pod.uid}`, 3),
    severity: 'none',
    reason: 'All rules healthy',
  };
};
