/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  AGENT_MEMORY_WORKFLOW_IDS,
  ALL_INSTALLABLE_WORKFLOW_IDS,
  DEFAULT_SPACE_MAINTENANCE_WORKFLOW_IDS,
  GLOBAL_CORE_WORKFLOW_IDS,
  GLOBAL_MAINTENANCE_WORKFLOW_IDS,
  MEMORY_WORKFLOW_IDS,
  SCHEDULED_MAINTENANCE_WORKFLOW_IDS,
} from './managed_workflow_targets';

describe('managed_workflow_targets registry', () => {
  it('includes every installable workflow id in the maintenance sweep lists', () => {
    const maintenanceIds = new Set<string>([
      ...GLOBAL_MAINTENANCE_WORKFLOW_IDS,
      ...DEFAULT_SPACE_MAINTENANCE_WORKFLOW_IDS,
      ...SCHEDULED_MAINTENANCE_WORKFLOW_IDS,
    ]);

    for (const id of ALL_INSTALLABLE_WORKFLOW_IDS) {
      expect(maintenanceIds.has(id)).toBe(true);
    }
  });

  it('keeps core + investigation + memory as the global maintenance set', () => {
    expect(GLOBAL_MAINTENANCE_WORKFLOW_IDS).toEqual([
      ...GLOBAL_CORE_WORKFLOW_IDS,
      SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
      ...MEMORY_WORKFLOW_IDS,
      ...AGENT_MEMORY_WORKFLOW_IDS,
    ]);
  });

  it('sweeps the agent_memory curation workflows without installing them', () => {
    // Owned by the agent_memory plugin, but paused with Significant Events so the
    // pause banner's promise that memory activity stops stays true.
    for (const id of AGENT_MEMORY_WORKFLOW_IDS) {
      expect(GLOBAL_MAINTENANCE_WORKFLOW_IDS).toContain(id);
      expect(ALL_INSTALLABLE_WORKFLOW_IDS).not.toContain(id);
    }
  });

  it('keeps continuous onboarding in the default-space set (not memory)', () => {
    expect(DEFAULT_SPACE_MAINTENANCE_WORKFLOW_IDS).toEqual(
      expect.arrayContaining([SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID])
    );
    for (const id of MEMORY_WORKFLOW_IDS) {
      expect(DEFAULT_SPACE_MAINTENANCE_WORKFLOW_IDS).not.toContain(id);
    }
  });
});
