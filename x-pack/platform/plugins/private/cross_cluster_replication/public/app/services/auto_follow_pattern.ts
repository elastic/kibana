/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export interface FollowPattern {
  followPattern: {
    prefix: string;
    suffix: string;
    template: string;
  };
  toString: string;
}

const getFollowPattern = (
  prefix = '',
  suffix = '',
  template = '{{leader_index}}'
): FollowPattern => ({
  followPattern: {
    prefix,
    suffix,
    template,
  },
  toString: prefix + template + suffix,
});

interface GetPreviewIndicesFromAutoFollowPatternParams {
  prefix: string;
  suffix: string;
  leaderIndexPatterns: string[];
  limit?: number;
  wildcardPlaceHolders?: string[];
}

/**
 * Generate an array of indices preview that would be generated for an auto-follow pattern.
 * It concatenates the prefix + the leader index pattern populated with values + the suffix
 *
 * Example of the array returned:
 * ["prefix_leader-index-0_suffix", "prefix_leader-index-1_suffix", "prefix_leader-index-2_suffix"]
 */
export const getPreviewIndicesFromAutoFollowPattern = ({
  prefix,
  suffix,
  leaderIndexPatterns,
  limit = 5,
  wildcardPlaceHolders = [
    moment().format('YYYY-MM-DD'),
    moment().add(1, 'days').format('YYYY-MM-DD'),
    moment().add(2, 'days').format('YYYY-MM-DD'),
  ],
}: GetPreviewIndicesFromAutoFollowPatternParams): {
  indicesPreview: FollowPattern[];
  hasMore: boolean;
} => {
  const indicesPreview: FollowPattern[] = [];
  let indexPreview: FollowPattern;
  let leaderIndexTemplate: string;

  leaderIndexPatterns.forEach((leaderIndexPattern) => {
    wildcardPlaceHolders.forEach((placeHolder) => {
      leaderIndexTemplate = leaderIndexPattern.replace(/\*/g, placeHolder);
      indexPreview = getFollowPattern(prefix, suffix, leaderIndexTemplate);

      if (
        !indicesPreview.some((_indexPreview) => indexPreview.toString === _indexPreview.toString)
      ) {
        indicesPreview.push(indexPreview);
      }
    });
  });

  return {
    indicesPreview: indicesPreview.slice(0, limit),
    hasMore: indicesPreview.length > limit,
  };
};

export const getPrefixSuffixFromFollowPattern = (
  followPattern: string
): {
  followIndexPatternPrefix: string | undefined;
  followIndexPatternSuffix: string | undefined;
} => {
  let followIndexPatternPrefix;
  let followIndexPatternSuffix;

  const template = '{{leader_index}}';
  const index = followPattern.indexOf(template);

  if (index >= 0) {
    followIndexPatternPrefix = followPattern.slice(0, index);
    followIndexPatternSuffix = followPattern.slice(index + template.length);
  }

  return { followIndexPatternPrefix, followIndexPatternSuffix };
};
