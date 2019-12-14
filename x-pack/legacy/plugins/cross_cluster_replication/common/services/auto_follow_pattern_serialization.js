/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const deserializeAutoFollowPattern = (
  { name, pattern: { remote_cluster, leader_index_patterns, follow_index_pattern } } = {
    pattern: {},
  } // eslint-disable-line camelcase
) => ({
  name,
  remoteCluster: remote_cluster,
  leaderIndexPatterns: leader_index_patterns,
  followIndexPattern: follow_index_pattern,
});

export const deserializeListAutoFollowPatterns = autoFollowPatterns =>
  autoFollowPatterns.map(deserializeAutoFollowPattern);

export const serializeAutoFollowPattern = ({
  remoteCluster,
  leaderIndexPatterns,
  followIndexPattern,
}) => ({
  remote_cluster: remoteCluster,
  leader_index_patterns: leaderIndexPatterns,
  follow_index_pattern: followIndexPattern,
});
