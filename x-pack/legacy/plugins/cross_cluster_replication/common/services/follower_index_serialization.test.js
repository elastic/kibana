/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  deserializeShard,
  deserializeFollowerIndex,
  deserializeListFollowerIndices,
  serializeFollowerIndex,
} from './follower_index_serialization';

describe('[CCR] follower index serialization', () => {
  describe('deserializeShard()', () => {
    it('deserializes shard', () => {
      const serializedShard = {
        remote_cluster: 'remote cluster',
        leader_index: 'leader index',
        shard_id: 'shard id',
        leader_global_checkpoint: 'leader global checkpoint',
        leader_max_seq_no: 'leader max seq no',
        follower_global_checkpoint: 'follower global checkpoint',
        follower_max_seq_no: 'follower max seq no',
        last_requested_seq_no: 'last requested seq no',
        outstanding_read_requests: 'outstanding read requests',
        outstanding_write_requests: 'outstanding write requests',
        write_buffer_operation_count: 'write buffer operation count',
        write_buffer_size_in_bytes: 'write buffer size in bytes',
        follower_mapping_version: 'follower mapping version',
        follower_settings_version: 'follower settings version',
        total_read_time_millis: 'total read time millis',
        total_read_remote_exec_time_millis: 'total read remote exec time millis',
        successful_read_requests: 'successful read requests',
        failed_read_requests: 'failed read requests',
        operations_read: 'operations read',
        bytes_read: 'bytes read',
        total_write_time_millis: 'total write time millis',
        successful_write_requests: 'successful write requests',
        failed_write_requests: 'failed write requests',
        operations_written: 'operations written',
        read_exceptions: ['read exception'],
        time_since_last_read_millis: 'time since last read millis',
      };

      expect(deserializeShard(serializedShard)).toMatchSnapshot();
    });
  });

  describe('deserializeFollowerIndex()', () => {
    it('deserializes Elasticsearch follower index object', () => {
      const serializedFollowerIndex = {
        index: 'follower index name',
        status: 'active',
        shards: [
          {
            shard_id: 'shard 1',
          },
          {
            shard_id: 'shard 2',
          },
        ],
      };

      expect(deserializeFollowerIndex(serializedFollowerIndex)).toMatchSnapshot();
    });
  });

  describe('deserializeListFollowerIndices()', () => {
    it('deserializes list of Elasticsearch follower index objects', () => {
      const serializedFollowerIndexList = [
        {
          follower_index: 'follower index 1',
          remote_cluster: 'cluster 1',
          leader_index: 'leader 1',
          status: 'active',
          parameters: {
            max_read_request_operation_count: 1,
            max_outstanding_read_requests: 1,
            max_read_request_size: 1,
            max_write_request_operation_count: 1,
            max_write_request_size: 1,
            max_outstanding_write_requests: 1,
            max_write_buffer_count: 1,
            max_write_buffer_size: 1,
            max_retry_delay: 1,
            read_poll_timeout: 1,
          },
          shards: [],
        },
        {
          follower_index: 'follower index 2',
          remote_cluster: 'cluster 2',
          leader_index: 'leader 2',
          status: 'paused',
          parameters: {
            max_read_request_operation_count: 2,
            max_outstanding_read_requests: 2,
            max_read_request_size: 2,
            max_write_request_operation_count: 2,
            max_write_request_size: 2,
            max_outstanding_write_requests: 2,
            max_write_buffer_count: 2,
            max_write_buffer_size: 2,
            max_retry_delay: 2,
            read_poll_timeout: 2,
          },
          shards: [],
        },
      ];

      const deserializedFollowerIndexList = [
        {
          name: 'follower index 1',
          remoteCluster: 'cluster 1',
          leaderIndex: 'leader 1',
          status: 'active',
          maxReadRequestOperationCount: 1,
          maxOutstandingReadRequests: 1,
          maxReadRequestSize: 1,
          maxWriteRequestOperationCount: 1,
          maxWriteRequestSize: 1,
          maxOutstandingWriteRequests: 1,
          maxWriteBufferCount: 1,
          maxWriteBufferSize: 1,
          maxRetryDelay: 1,
          readPollTimeout: 1,
          shards: [],
        },
        {
          name: 'follower index 2',
          remoteCluster: 'cluster 2',
          leaderIndex: 'leader 2',
          status: 'paused',
          maxReadRequestOperationCount: 2,
          maxOutstandingReadRequests: 2,
          maxReadRequestSize: 2,
          maxWriteRequestOperationCount: 2,
          maxWriteRequestSize: 2,
          maxOutstandingWriteRequests: 2,
          maxWriteBufferCount: 2,
          maxWriteBufferSize: 2,
          maxRetryDelay: 2,
          readPollTimeout: 2,
          shards: [],
        },
      ];

      expect(deserializeListFollowerIndices(serializedFollowerIndexList)).toEqual(
        deserializedFollowerIndexList
      );
    });
  });

  describe('serializeFollowerIndex()', () => {
    it('serializes object to Elasticsearch follower index object', () => {
      const deserializedFollowerIndex = {
        remoteCluster: 'remote cluster',
        leaderIndex: 'leader index',
        maxReadRequestOperationCount: 'foo',
        maxOutstandingReadRequests: 'foo',
        maxReadRequestSize: 'foo',
        maxWriteRequestOperationCount: 'foo',
        maxWriteRequestSize: 'foo',
        maxOutstandingWriteRequests: 'foo',
        maxWriteBufferCount: 'foo',
        maxWriteBufferSize: 'foo',
        maxRetryDelay: 'foo',
        readPollTimeout: 'foo',
      };

      expect(serializeFollowerIndex(deserializedFollowerIndex)).toMatchSnapshot();
    });
  });
});
