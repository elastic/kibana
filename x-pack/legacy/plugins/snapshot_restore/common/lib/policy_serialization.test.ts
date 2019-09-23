/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { deserializePolicy, serializePolicy, deserializePolicyStats } from './policy_serialization';

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
            retention: {
              expire_after: '14d',
              max_count: 30,
              min_count: 4,
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
        retention: {
          expireAfterValue: 14,
          expireAfterUnit: 'd',
          maxCount: 30,
          minCount: 4,
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

  describe('serializePolicy()', () => {
    it('should serialize a slm policy', () => {
      expect(
        serializePolicy({
          name: 'my-snapshot-policy',
          snapshotName: 'my-backups-snapshots',
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
          retention: {
            expireAfterValue: 14,
            expireAfterUnit: 'd',
            maxCount: 30,
            minCount: 4,
          },
        })
      ).toEqual({
        name: 'my-backups-snapshots',
        schedule: '0 30 1 * * ?',
        repository: 'my-backups',
        config: {
          indices: ['kibana-*'],
          include_global_state: false,
          ignore_unavailable: false,
          metadata: {
            foo: 'bar',
          },
        },
        retention: {
          expire_after: '14d',
          max_count: 30,
          min_count: 4,
        },
      });
    });
  });

  describe('deserializePolicyStats()', () => {
    it('should deserialize a slm stats', () => {
      expect(
        deserializePolicyStats({
          retention_runs: 13,
          retention_failed: 0,
          retention_timed_out: 0,
          retention_deletion_time: '1.4s',
          retention_deletion_time_millis: 1404,
          policy_metrics: {
            'daily-snapshots2': {
              snapshots_taken: 7,
              snapshots_failed: 0,
              snapshots_deleted: 6,
              snapshot_deletion_failures: 0,
            },
            'daily-snapshots': {
              snapshots_taken: 12,
              snapshots_failed: 0,
              snapshots_deleted: 12,
              snapshot_deletion_failures: 6,
            },
          },
          total_snapshots_taken: 19,
          total_snapshots_failed: 0,
          total_snapshots_deleted: 18,
          total_snapshot_deletion_failures: 0,
        })
      ).toEqual({
        retentionRuns: 13,
        retentionFailed: 0,
        retentionTimedOut: 0,
        retentionDeletionTime: '1.4s',
        retentionDeletionTimeMillis: 1404,
        totalSnapshotsTaken: 19,
        totalSnapshotsFailed: 0,
        totalSnapshotsDeleted: 18,
        totalSnapshotDeletionFailures: 0,
      });
    });
  });
});
