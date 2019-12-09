/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deserializeSnapshotDetails } from './snapshot_serialization';

describe('deserializeSnapshotDetails', () => {
  test('deserializes a snapshot', () => {
    expect(
      deserializeSnapshotDetails(
        'repositoryName',
        {
          snapshot: 'snapshot name',
          uuid: 'UUID',
          version_id: 5,
          version: 'version',
          indices: ['index2', 'index3', 'index1'],
          include_global_state: false,
          state: 'SUCCESS',
          start_time: '0',
          start_time_in_millis: 0,
          end_time: '1',
          end_time_in_millis: 1,
          duration_in_millis: 1,
          shards: {
            total: 3,
            failed: 1,
            successful: 2,
          },
          failures: [
            {
              index: 'z',
              shard: 1,
            },
            {
              index: 'a',
              shard: 3,
            },
            {
              index: 'a',
              shard: 1,
            },
            {
              index: 'a',
              shard: 2,
            },
          ],
        },
        'found-snapshots',
        [
          {
            snapshot: 'last_successful_snapshot',
            uuid: 'last_successful_snapshot_UUID',
            version_id: 5,
            version: 'version',
            indices: ['index2', 'index3', 'index1'],
            include_global_state: false,
            state: 'SUCCESS',
            start_time: '0',
            start_time_in_millis: 0,
            end_time: '1',
            end_time_in_millis: 1,
            duration_in_millis: 1,
            shards: {
              total: 3,
              failed: 1,
              successful: 2,
            },
            failures: [
              {
                index: 'z',
                shard: 1,
              },
              {
                index: 'a',
                shard: 3,
              },
              {
                index: 'a',
                shard: 1,
              },
              {
                index: 'a',
                shard: 2,
              },
            ],
          },
        ]
      )
    ).toEqual({
      repository: 'repositoryName',
      snapshot: 'snapshot name',
      uuid: 'UUID',
      versionId: 5,
      version: 'version',
      // Indices are sorted.
      indices: ['index1', 'index2', 'index3'],
      includeGlobalState: false,
      // Failures are grouped and sorted by index, and the failures themselves are sorted by shard.
      indexFailures: [
        {
          index: 'a',
          failures: [
            {
              shard: 1,
            },
            {
              shard: 2,
            },
            {
              shard: 3,
            },
          ],
        },
        {
          index: 'z',
          failures: [
            {
              shard: 1,
            },
          ],
        },
      ],
      state: 'SUCCESS',
      startTime: '0',
      startTimeInMillis: 0,
      endTime: '1',
      endTimeInMillis: 1,
      durationInMillis: 1,
      shards: {
        total: 3,
        failed: 1,
        successful: 2,
      },
      managedRepository: 'found-snapshots',
      isLastSuccessfulSnapshot: false,
    });
  });
});
