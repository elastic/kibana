/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRandomString } from '../../../../test_utils';

export const getAutoFollowPatternMock = (
  name = getRandomString(),
  remoteCluster = getRandomString(),
  leaderIndexPatterns = [getRandomString()],
  followIndexPattern = getRandomString()
) => ({
  name,
  pattern: {
    remote_cluster: remoteCluster,
    leader_index_patterns: leaderIndexPatterns,
    follow_index_pattern: followIndexPattern,
  },
});

export const getAutoFollowPatternListMock = (total = 3) => {
  const list = {
    patterns: [],
  };

  let i = total;
  while (i--) {
    list.patterns.push(getAutoFollowPatternMock());
  }

  return list;
};

// -----------------
// Client test mock
// -----------------
export const getAutoFollowPatternClientMock = ({
  name = getRandomString(),
  remoteCluster = getRandomString(),
  leaderIndexPatterns = [`${getRandomString()}-*`],
  followIndexPattern = getRandomString(),
}) => ({
  name,
  remoteCluster,
  leaderIndexPatterns,
  followIndexPattern,
});
