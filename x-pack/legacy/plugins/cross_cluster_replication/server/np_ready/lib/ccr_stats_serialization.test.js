/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deserializeAutoFollowStats } from './ccr_stats_serialization';

describe('[CCR] auto-follow stats serialization', () => {
  it('should deserialize auto-follow stats', () => {
    const esObject = {
      number_of_failed_follow_indices: 0,
      number_of_failed_remote_cluster_state_requests: 0,
      number_of_successful_follow_indices: 0,
      recent_auto_follow_errors: [
        {
          leader_index: 'pattern-1:kibana_sample_1',
          auto_follow_exception: {
            type: 'exception',
            reason:
              'index to follow [kibana_sample_1] for pattern [pattern-1] matches with other patterns [pattern-2]',
          },
        },
        {
          leader_index: 'pattern-2:kibana_sample_1',
          auto_follow_exception: {
            type: 'exception',
            reason:
              'index to follow [kibana_sample_1] for pattern [pattern-2] matches with other patterns [pattern-1]',
          },
        },
      ],
      auto_followed_clusters: [
        {
          cluster_name: 'new-york',
          time_since_last_check_millis: 2426,
          last_seen_metadata_version: 15,
        },
      ],
    };

    expect(deserializeAutoFollowStats(esObject)).toMatchSnapshot();
  });
});
