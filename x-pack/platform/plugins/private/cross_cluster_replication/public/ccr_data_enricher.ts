/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { CcrFollowInfoResponse } from '@elastic/elasticsearch/lib/api/types';
import type { EnricherResponse } from '@kbn/index-management-shared-types';
import { i18n } from '@kbn/i18n';
const SOURCE = i18n.translate('xpack.crossClusterReplication.ccrDataEnricher.source', {
  defaultMessage: 'cross cluster replication',
});

export const ccrDataEnricher = {
  name: SOURCE,
  fn: async (client: HttpSetup, signal: AbortSignal): Promise<EnricherResponse> =>
    client
      .get<CcrFollowInfoResponse>('/api/cross_cluster_replication/follower_info', { signal })
      .then((response) => {
        return {
          indices: response.follower_indices.map((followerIndex) => ({
            name: followerIndex.follower_index,
            isFollowerIndex: true,
          })),
          source: SOURCE,
        };
      }),
};
