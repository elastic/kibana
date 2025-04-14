/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { RunTimeMappings } from '../../../../../../common/api/search_strategy/model/runtime_mappings';

export const buildTimelineDetailsQuery = ({
  authFilter,
  id,
  indexName,
  runtimeMappings,
}: {
  authFilter?: JsonObject;
  id: string;
  indexName: string;
  runtimeMappings: RunTimeMappings;
}) => {
  const basicFilter = {
    terms: {
      _id: [id],
    },
  };
  const query =
    authFilter != null
      ? {
          bool: {
            filter: [basicFilter, authFilter],
          },
        }
      : {
          terms: {
            _id: [id],
          },
        };

  return {
    allow_no_indices: true,
    index: indexName,
    ignore_unavailable: true,
    body: {
      query,
      fields: [
        { field: '*', include_unmapped: true },
        {
          field: '@timestamp',
          format: 'strict_date_optional_time',
        },
        {
          field: 'code_signature.timestamp',
          format: 'strict_date_optional_time',
        },
        {
          field: 'dll.code_signature.timestamp',
          format: 'strict_date_optional_time',
        },
      ],
      // Remove and instead pass index_pattern.id once issue resolved: https://github.com/elastic/kibana/issues/111762
      runtime_mappings: runtimeMappings,
      stored_fields: ['*'],
      _source: true,
    },
    size: 1,
  };
};
