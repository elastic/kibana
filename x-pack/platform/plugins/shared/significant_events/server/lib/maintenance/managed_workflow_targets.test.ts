/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_RUN_QUOTA_ENFORCE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  ALL_INSTALLABLE_WORKFLOW_IDS,
  ALWAYS_ON_WORKFLOW_IDS,
  DEFAULT_SPACE_MAINTENANCE_WORKFLOW_IDS,
  GLOBAL_CORE_WORKFLOW_IDS,
  GLOBAL_MAINTENANCE_WORKFLOW_IDS,
  MEMORY_WORKFLOW_IDS,
  SCHEDULED_MAINTENANCE_WORKFLOW_IDS,
  buildCancelTargets,
  buildDisableTargets,
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

  it('keeps core + investigation + memory + run-quota enforce as the global maintenance set', () => {
    expect(GLOBAL_MAINTENANCE_WORKFLOW_IDS).toEqual([
      ...GLOBAL_CORE_WORKFLOW_IDS,
      SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
      ...MEMORY_WORKFLOW_IDS,
      ...ALWAYS_ON_WORKFLOW_IDS,
    ]);
  });

  it('never disables or cancels run-quota enforcement on pause', () => {
    const spaceIds = ['default', 'space-a'];
    const disableIds = new Set(buildDisableTargets(spaceIds).map(({ id }) => id));
    const cancelIds = new Set(buildCancelTargets(spaceIds).map(({ id }) => id));

    expect(ALWAYS_ON_WORKFLOW_IDS).toContain(SIGNIFICANT_EVENTS_RUN_QUOTA_ENFORCE_WORKFLOW_ID);
    for (const id of ALWAYS_ON_WORKFLOW_IDS) {
      expect(disableIds.has(id)).toBe(false);
      expect(cancelIds.has(id)).toBe(false);
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
