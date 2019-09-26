/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ccrDataEnricher = async (indicesList, callWithRequest) => {
  if (!indicesList || !indicesList.length) {
    return indicesList;
  }
  const params = {
    path: '/_all/_ccr/info',
    method: 'GET',
  };
  try {
    const { follower_indices: followerIndices } = await callWithRequest('transport.request', params);
    return indicesList.map(index => {
      const isFollowerIndex  = !!followerIndices.find((followerIndex) => {
        return followerIndex.follower_index === index.name;
      });
      return {
        ...index,
        isFollowerIndex
      };
    });
  } catch (e) {
    return indicesList;
  }

};
