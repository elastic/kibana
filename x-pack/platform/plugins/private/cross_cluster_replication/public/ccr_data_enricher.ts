/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { CcrFollowInfoResponse } from '@elastic/elasticsearch/lib/api/types';
import type { EnricherResponse } from '@kbn/index-management-shared-types';
const SOURCE = 'ccr_data_enricher';

export const ccrDataEnricher = async (client: HttpSetup): Promise<EnricherResponse> =>
  client
    .get<CcrFollowInfoResponse>('/api/cross_cluster_replication/follower_info')
    .then((response) => {
      return {
        indices: response.follower_indices.map((followerIndex) => ({
          name: followerIndex.follower_index,
          isFollowerIndex: true,
        })),
        source: SOURCE,
      };
    })
    .catch((error) => {
      return {
        error: 'Failed to load cross cluster replication data',
        source: SOURCE,
      };
    });
