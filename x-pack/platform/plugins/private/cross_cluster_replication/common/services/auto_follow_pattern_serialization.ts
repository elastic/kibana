/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AutoFollowPattern, AutoFollowPatternFromEs, AutoFollowPatternToEs } from '../types';

export const deserializeAutoFollowPattern = (
  autoFollowPattern: AutoFollowPatternFromEs
): AutoFollowPattern => {
  const {
    name,
    pattern: {
      active,
      remote_cluster: remoteCluster,
      leader_index_patterns: leaderIndexPatterns,
      leader_index_exclusion_patterns: leaderIndexExclusionPatterns = [],
      follow_index_pattern: followIndexPattern,
    },
  } = autoFollowPattern;

  return {
    name,
    active,
    remoteCluster,
    leaderIndexPatterns,
    leaderIndexExclusionPatterns,
    followIndexPattern,
  };
};

export const deserializeListAutoFollowPatterns = (
  autoFollowPatterns: AutoFollowPatternFromEs[]
): AutoFollowPattern[] => autoFollowPatterns.map(deserializeAutoFollowPattern);

export const serializeAutoFollowPattern = ({
  remoteCluster,
  leaderIndexPatterns,
  leaderIndexExclusionPatterns = [],
  followIndexPattern,
}: Pick<
  AutoFollowPattern,
  'remoteCluster' | 'leaderIndexPatterns' | 'leaderIndexExclusionPatterns' | 'followIndexPattern'
>): AutoFollowPatternToEs => ({
  remote_cluster: remoteCluster,
  leader_index_patterns: leaderIndexPatterns,
  leader_index_exclusion_patterns: leaderIndexExclusionPatterns,
  follow_index_pattern: followIndexPattern,
});
