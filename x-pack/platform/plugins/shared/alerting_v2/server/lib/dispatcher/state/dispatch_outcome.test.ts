/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionGroup, createDispatchFailure } from '../fixtures/test_utils';
import { DispatchOutcome } from './dispatch_outcome';

describe('DispatchOutcome', () => {
  it('exposes execution ids per group', () => {
    const outcome = DispatchOutcome.of({
      executionsByGroup: new Map([['g1', ['exec-1', 'exec-2']]]),
      failures: [],
    });

    expect(outcome.executionIdsFor('g1')).toEqual(['exec-1', 'exec-2']);
    expect(outcome.executionIdsFor('missing')).toEqual([]);
    expect(outcome.scheduledGroupCount).toBe(1);
    expect(outcome.hasFailures()).toBe(false);
  });

  describe('deliveredDestinationsFor', () => {
    const group = createActionGroup({
      id: 'g1',
      destinations: [
        { type: 'workflow', id: 'wf-1' },
        { type: 'workflow', id: 'wf-2' },
      ],
    });

    it('returns all destinations when the group recorded no failures', () => {
      const outcome = DispatchOutcome.of({
        executionsByGroup: new Map(),
        failures: [createDispatchFailure({ actionGroupId: 'other-group', workflowId: 'wf-1' })],
      });

      expect(outcome.deliveredDestinationsFor(group)).toEqual(group.destinations);
    });

    it('excludes destinations that recorded a failure', () => {
      const outcome = DispatchOutcome.of({
        executionsByGroup: new Map(),
        failures: [createDispatchFailure({ actionGroupId: 'g1', workflowId: 'wf-1' })],
      });

      expect(outcome.deliveredDestinationsFor(group)).toEqual([{ type: 'workflow', id: 'wf-2' }]);
      expect(outcome.hasFailures()).toBe(true);
    });

    it('returns an empty list when every destination failed (total failure)', () => {
      const outcome = DispatchOutcome.of({
        executionsByGroup: new Map(),
        failures: [
          createDispatchFailure({ actionGroupId: 'g1', workflowId: 'wf-1' }),
          createDispatchFailure({ actionGroupId: 'g1', workflowId: 'wf-2' }),
        ],
      });

      expect(outcome.deliveredDestinationsFor(group)).toEqual([]);
    });
  });
});
