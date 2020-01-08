/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_RESULTS_INDEX_PATTERN } from '../../../../../common/constants/index_patterns';

import { getInfluencers, ExplorerJob } from '../../explorer_utils';

// Creates index pattern in the format expected by the kuery bar/kuery autocomplete provider
// Field objects required fields: name, type, aggregatable, searchable
export function getIndexPattern(selectedJobs: ExplorerJob[]) {
  return {
    title: ML_RESULTS_INDEX_PATTERN,
    fields: getInfluencers(selectedJobs).map(influencer => ({
      name: influencer,
      type: 'string',
      aggregatable: true,
      searchable: true,
    })),
  };
}
