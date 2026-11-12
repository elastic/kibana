/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRecordMaintenanceRunStepDefinition } from './record_maintenance_run';
import { createMockStepContext, mockKiStepTelemetry } from './test_utils';

describe('getRecordMaintenanceRunStepDefinition', () => {
  it('counts the changes of each kind and reports them without any text', async () => {
    const telemetry = mockKiStepTelemetry();
    const context = createMockStepContext({
      input: {
        ai_index_id: 'support',
        mode: 'report',
        braked: true,
        reviewed: 12,
        written: 3,
        changes: [
          { id: 'e-1', change: 'merged', reason: 'Same person' },
          { id: 'e-2', change: 'superseded', reason: 'Same person' },
          { id: 'f-1', change: 'superseded', reason: 'Conflicts with f-2' },
          { id: 'rel-1', change: 'tombstoned', reason: 'Links a deleted item' },
        ],
        needs_review: [{ id: 'f-3', change: 'needs_review', reason: 'A person edited it' }],
        rejected: [],
      },
      esClient: {},
    });

    const { output } = await getRecordMaintenanceRunStepDefinition(telemetry).handler(context);

    const counts = {
      reviewed: 12,
      written: 3,
      merged: 1,
      superseded: 2,
      rewritten: 0,
      summarized: 0,
      tombstoned: 1,
      needs_review: 1,
      rejected: 0,
    };
    expect(output).toEqual(counts);
    expect(telemetry.analyticsService.reportMemoryMaintenanceRun).toHaveBeenCalledWith({
      ai_index_id: 'support',
      mode: 'report',
      braked: true,
      ...counts,
    });
  });
});
