/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepmerge from 'deepmerge';
import { createFilter } from '../../helpers';
import { ESTermQuery } from '../../../../common/typed_json';
import { SiemJob } from '../../../components/ml_popover/types';

export const getAnomaliesFilterQuery = (
  filterQuery: string | ESTermQuery | undefined,
  anomaliesFilterQuery: object = {},
  siemJobs: SiemJob[] = [],
  anomalyScore: number
): string => {
  const siemJobIds = siemJobs
    .filter(job => job.isInstalled)
    .map(job => job.id)
    .map(jobId => ({
      match_phrase: {
        job_id: jobId,
      },
    }));

  const filterQueryString = createFilter(filterQuery);
  const filterQueryObject = filterQueryString ? JSON.parse(filterQueryString) : {};
  const mergedFilterQuery = deepmerge.all([
    filterQueryObject,
    anomaliesFilterQuery,
    {
      bool: {
        filter: [
          {
            bool: {
              should: siemJobIds,
              minimum_should_match: 1,
            },
          },
          {
            match_phrase: {
              result_type: 'record',
            },
          },
          {
            range: {
              record_score: {
                gte: anomalyScore,
              },
            },
          },
        ],
      },
    },
  ]);

  return JSON.stringify(mergedFilterQuery);
};
