/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Index } from '@kbn/index-management-shared-types';

export const ccrDataEnricher = async (indicesList: Index[], client: IScopedClusterClient) => {
  if (!indicesList?.length) {
    return indicesList;
  }

  try {
    // to do need to make an endpoint for this
    const { follower_indices: followerIndices } = await client.asCurrentUser.ccr.followInfo({
      index: '_all',
    });

    return indicesList.map((index) => {
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
  } catch (e) {
    return indicesList;
  }
};
