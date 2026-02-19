/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ISearchRequestParams } from '@kbn/search-types';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import { isEmpty } from 'lodash';

import { getQueryFilter } from '../../../../utils/build_query';
import { ACTIONS_INDEX } from '../../../../../common/constants';
import type { UnifiedHistoryRequestOptions } from '../../../../../common/search_strategy/osquery/unified_history';

export const buildUnifiedHistoryActionsQuery = ({
  kuery = '',
  pageSize,
  cursor,
  componentTemplateExists,
  spaceId,
}: UnifiedHistoryRequestOptions): ISearchRequestParams => {
  const {
    bool: { filter },
  } = getQueryFilter({ filter: kuery });

  let extendedFilter = filter;

  if (spaceId === 'default') {
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
    extendedFilter = [...filter, { term: { space_id: spaceId } }];
  }

  const cursorFilter: estypes.QueryDslQueryContainer[] =
    cursor && !isEmpty(cursor)
      ? [{ range: { '@timestamp': { lt: cursor } } }]
      : [];

  return {
    allow_no_indices: true,
    index: componentTemplateExists ? `${ACTIONS_INDEX}*` : AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: [...extendedFilter, ...cursorFilter],
        must: [
          {
            term: {
              type: { value: 'INPUT_ACTION' },
            },
          },
          {
            term: {
              input_type: 'osquery',
            },
          },
        ] as estypes.QueryDslQueryContainer[],
      },
    },
    from: 0,
    size: pageSize,
    track_total_hits: true,
    fields: ['*'],
    sort: [{ '@timestamp': { order: 'desc' } }],
  };
};
