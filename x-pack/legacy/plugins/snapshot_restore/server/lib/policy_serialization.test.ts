/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { deserializePolicy } from './policy_serialization';

describe('repository_serialization', () => {
  describe('deserializePolicy()', () => {
    it('should deserialize a slm policy', () => {
      expect(
        deserializePolicy('my-backups-snapshots', {
          version: 1,
          modified_date_millis: 1562710315761,
          policy: {
            name: '<daily-snap-{now/d}>',
            schedule: '0 30 1 * * ?',
            repository: 'my-backups',
            config: {
              indices: ['kibana-*'],
              ignore_unavailable: false,
              include_global_state: false,
            },
          },
          next_execution_millis: 1562722200000,
        })
      ).toEqual({
        name: 'my-backups-snapshots',
        version: 1,
        modifiedDateMillis: 1562710315761,
        snapshotName: '<daily-snap-{now/d}>',
        schedule: '0 30 1 * * ?',
        repository: 'my-backups',
        config: { indices: ['kibana-*'], includeGlobalState: false, ignoreUnavailable: false },
        nextExecutionMillis: 1562722200000,
      });
    });
  });
});
