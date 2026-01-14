/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { CcrFollowInfoResponse } from '@elastic/elasticsearch/lib/api/types';

export const ccrDataEnricher = async (client: HttpSetup) =>
  client.get<CcrFollowInfoResponse>('/internal/ccr/follower_info');

/*
this is just setting a boolean whether its a follower index
indicesList.map((index) => {
      const isFollowerIndex = !!followerIndices.find(
        (followerIndex: { follower_index: string }) => {
          return followerIndex.follower_index === index.name;
        }
      );
      return {
        ...index,
        isFollowerIndex,
      };
    });
    */
