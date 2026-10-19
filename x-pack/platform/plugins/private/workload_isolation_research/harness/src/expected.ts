/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpectedInventory, ExpectedRole } from './score';
import type { Scenario } from './types';

/**
 * Expected telemetry inventory for a run, derived from the target topology (the routable pod's
 * node roles) and the enabled sources. The scorer proves coverage against this, so a pod or a
 * source that sends nothing at all is INVALID rather than silently absent.
 */
export const buildExpected = (
  scenario: Scenario,
  info: Record<string, any>,
  expectedPods: number
): ExpectedInventory | undefined => {
  if (scenario.externalOnly) {
    return {
      roles: [],
      ticks: null,
      laptop_probe_rps: scenario.laptopProbe.rps,
      in_pod_probe_rps: null,
    };
  }
  const roles = info.node_roles as { ui?: boolean; backgroundTasks?: boolean } | undefined;
  if (!roles) return undefined;
  const common = ['gap_window', 'main_hb', 'proc'];
  const out: ExpectedRole[] = [];
  if (roles.ui && roles.backgroundTasks) {
    out.push({
      role: 'combined',
      min_pods: Math.max(1, expectedPods),
      sources: [...common, 'probe', 'tm_polls'],
    });
  } else {
    // Serverless split: routable UI pod(s) run the in-pod probe; background pods are reached via
    // the push path only and must show TM poll telemetry.
    out.push({ role: 'ui', min_pods: Math.max(1, expectedPods), sources: [...common, 'probe'] });
    out.push({ role: 'background', min_pods: 1, sources: [...common, 'tm_polls'] });
  }
  return {
    roles: out,
    ticks: { interval_ms: scenario.ticks.intervalMs },
    laptop_probe_rps: scenario.laptopProbe.rps,
    in_pod_probe_rps: scenario.probe.rps,
  };
};
