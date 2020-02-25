/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  deserializeAutoFollowPattern,
  deserializeListAutoFollowPatterns,
  serializeAutoFollowPattern,
} from './auto_follow_pattern_serialization';

describe('[CCR] auto-follow_serialization', () => {
  describe('deserializeAutoFollowPattern()', () => {
    it('should return empty object if name or esObject are not provided', () => {
      expect(deserializeAutoFollowPattern()).toEqual({});
    });

    it('should deserialize Elasticsearch object', () => {
      const expected = {
        name: 'some-name',
        remoteCluster: 'foo',
        leaderIndexPatterns: ['foo-*'],
        followIndexPattern: 'bar',
      };

      const esObject = {
        name: 'some-name',
        pattern: {
          remote_cluster: expected.remoteCluster,
          leader_index_patterns: expected.leaderIndexPatterns,
          follow_index_pattern: expected.followIndexPattern,
        },
      };

      expect(deserializeAutoFollowPattern(esObject)).toEqual(expected);
    });
  });

  describe('deserializeListAutoFollowPatterns()', () => {
    it('should deserialize list of Elasticsearch objects', () => {
      const name1 = 'foo1';
      const name2 = 'foo2';

      const expected = [
        {
          name: name1,
          remoteCluster: 'foo1',
          leaderIndexPatterns: ['foo1-*'],
          followIndexPattern: 'bar2',
        },
        {
          name: name2,
          remoteCluster: 'foo2',
          leaderIndexPatterns: ['foo2-*'],
          followIndexPattern: 'bar2',
        },
      ];

      const esObjects = {
        patterns: [
          {
            name: name1,
            pattern: {
              remote_cluster: expected[0].remoteCluster,
              leader_index_patterns: expected[0].leaderIndexPatterns,
              follow_index_pattern: expected[0].followIndexPattern,
            },
          },
          {
            name: name2,
            pattern: {
              remote_cluster: expected[1].remoteCluster,
              leader_index_patterns: expected[1].leaderIndexPatterns,
              follow_index_pattern: expected[1].followIndexPattern,
            },
          },
        ],
      };

      expect(deserializeListAutoFollowPatterns(esObjects.patterns)).toEqual(expected);
    });
  });

  describe('serializeAutoFollowPattern()', () => {
    it('should serialize object to Elasticsearch object', () => {
      const expected = {
        remote_cluster: 'foo',
        leader_index_patterns: ['bar-*'],
        follow_index_pattern: 'faz',
      };

      const object = {
        remoteCluster: expected.remote_cluster,
        leaderIndexPatterns: expected.leader_index_patterns,
        followIndexPattern: expected.follow_index_pattern,
      };

      expect(serializeAutoFollowPattern(object)).toEqual(expected);
    });
  });
});
