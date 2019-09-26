/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { deserializePolicy } from './policy_serialization';

describe('repository_serialization', () => {
  describe('deserializePolicy()', () => {
    it('should deserialize a new slm policy', () => {
      expect(
        deserializePolicy('my-backups-snapshots', {
          version: 1,
          modified_date: '2019-07-09T22:11:55.761Z',
          modified_date_millis: 1562710315761,
          policy: {
            name: '<daily-snap-{now/d}>',
            schedule: '0 30 1 * * ?',
            repository: 'my-backups',
            config: {
              indices: ['kibana-*'],
              ignore_unavailable: false,
              include_global_state: false,
              metadata: {
                foo: 'bar',
              },
            },
          },
          next_execution: '2019-07-11T01:30:00.000Z',
          next_execution_millis: 1562722200000,
        })
      ).toEqual({
        name: 'my-backups-snapshots',
        version: 1,
        modifiedDate: '2019-07-09T22:11:55.761Z',
        modifiedDateMillis: 1562710315761,
        snapshotName: '<daily-snap-{now/d}>',
        schedule: '0 30 1 * * ?',
        repository: 'my-backups',
        config: {
          indices: ['kibana-*'],
          includeGlobalState: false,
          ignoreUnavailable: false,
          metadata: {
            foo: 'bar',
          },
        },
        nextExecution: '2019-07-11T01:30:00.000Z',
        nextExecutionMillis: 1562722200000,
      });
    });

    it('should deserialize a slm policy with success and failure info', () => {
      expect(
        deserializePolicy('my-backups-snapshots', {
          version: 1,
          modified_date: '2019-07-09T22:11:55.761Z',
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
          next_execution: '2019-07-11T01:30:00.000Z',
          next_execution_millis: 1562722200000,
          last_success: {
            snapshot_name: 'daily-snap-2019.07.10-ya_cajvksbcidtlbnnxt9q',
            time_string: '2019-07-10T01:30:02.548Z',
            time: 1562722202548,
          },
          last_failure: {
            snapshot_name: 'daily-snap-2019.07.10-cvi4m0uts5knejcrgq4qxq',
            time_string: '2019-07-10T01:30:02.443Z',
            time: 1562722202443,
            details: `{"type":"concurrent_snapshot_execution_exception",
            "reason":"[my-backups:daily-snap-2019.07.10-cvi4m0uts5knejcrgq4qxq] a snapshot is already running",
            "stack_trace":"Some stack trace"}`,
          },
        })
      ).toEqual({
        name: 'my-backups-snapshots',
        version: 1,
        modifiedDate: '2019-07-09T22:11:55.761Z',
        modifiedDateMillis: 1562710315761,
        snapshotName: '<daily-snap-{now/d}>',
        schedule: '0 30 1 * * ?',
        repository: 'my-backups',
        config: { indices: ['kibana-*'], includeGlobalState: false, ignoreUnavailable: false },
        nextExecution: '2019-07-11T01:30:00.000Z',
        nextExecutionMillis: 1562722200000,
        lastFailure: {
          details: {
            reason:
              '[my-backups:daily-snap-2019.07.10-cvi4m0uts5knejcrgq4qxq] a snapshot is already running',
            stack_trace: 'Some stack trace',
            type: 'concurrent_snapshot_execution_exception',
          },
          snapshotName: 'daily-snap-2019.07.10-cvi4m0uts5knejcrgq4qxq',
          time: 1562722202443,
          timeString: '2019-07-10T01:30:02.443Z',
        },
        lastSuccess: {
          snapshotName: 'daily-snap-2019.07.10-ya_cajvksbcidtlbnnxt9q',
          time: 1562722202548,
          timeString: '2019-07-10T01:30:02.548Z',
        },
      });
    });
  });
});
