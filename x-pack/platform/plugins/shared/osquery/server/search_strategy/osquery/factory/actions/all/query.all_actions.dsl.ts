/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ISearchRequestParams } from '@kbn/search-types';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';

import { getQueryFilter } from '../../../../../utils/build_query';
import { ACTIONS_INDEX } from '../../../../../../common/constants';

import type { ActionsRequestOptions } from '../../../../../../common/search_strategy/osquery/actions';

export const buildActionsQuery = ({
  kuery = '',
  sort,
  pagination: { cursorStart, querySize },
  componentTemplateExists,
  spaceId,
}: ActionsRequestOptions): ISearchRequestParams => {
  const {
    bool: { filter },
  } = getQueryFilter({ filter: kuery });

  let extendedFilter = filter;

  if (spaceId === 'default') {
    // For default space, include docs where space_id matches 'default' OR where space_id field does not exist
    extendedFilter = [
      {
        bool: {
          should: [
            { term: { space_id: 'default' } },
            { bool: { must_not: { exists: { field: 'space_id' } } } },
          ],
        },
      },
      ...filter,
    ];
  } else {
    // For other spaces, only include docs where space_id matches the current spaceId
    extendedFilter = [...filter, { term: { space_id: spaceId } }];
  }

  return {
    allow_no_indices: true,
    index: componentTemplateExists ? `${ACTIONS_INDEX}*` : AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: extendedFilter,
        must: [
          {
            term: {
              type: {
                value: 'INPUT_ACTION',
              },
            },
          },
          {
            term: {
              input_type: {
                value: 'osquery',
              },
            },
          },
        ] as estypes.QueryDslQueryContainer[],
      },
    },
    from: cursorStart,
    size: querySize,
    track_total_hits: true,
    fields: ['*'],
    sort: [
      {
        [sort.field]: {
          order: sort.direction,
        },
      },
    ],
  };
};
