/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import { isEmpty } from 'lodash';
import { getQueryFilter } from '../../../../../utils/build_query';
import { ACTIONS_INDEX } from '../../../../../../common/constants';
import type { ActionDetailsRequestOptions } from '../../../../../../common/search_strategy';

import { getPolicyIdsSubsetScriptFilter } from '../utils';

export const buildActionDetailsQuery = ({
  actionId,
  kuery,
  componentTemplateExists,
  policyIds,
  spaceId,
}: ActionDetailsRequestOptions): ISearchRequestParams => {
  const actionIdQuery = `action_id: ${actionId}`;
  let filter = actionIdQuery;
  if (!isEmpty(kuery)) {
    filter = filter + ` AND ${kuery}`;
  }

  const {
    bool: { filter: baseFilter },
  } = getQueryFilter({ filter });

  let extendedFilter = baseFilter;

  if (policyIds.length > 0) {
    if (spaceId === 'default') {
      extendedFilter = [
        {
          bool: {
            should: [
              getPolicyIdsSubsetScriptFilter(policyIds),
              { bool: { must_not: { exists: { field: 'policy_ids' } } } },
            ],
          },
        },
        ...baseFilter,
      ];
    } else {
      extendedFilter = [...baseFilter, getPolicyIdsSubsetScriptFilter(policyIds)];
    }
  } else {
    // When no osquery package policies exist in the current space,
    // return no results to prevent cross-space data leakage.
    // This is a railsafe check as user dont have access to actions
    // if there are no osquery package policies in the current space
    extendedFilter = [
      ...baseFilter,
      {
        bool: {
          must_not: {
            match_all: {},
          },
        },
      },
    ];
  }

  const dslQuery = {
    allow_no_indices: true,
    index: componentTemplateExists ? `${ACTIONS_INDEX}*` : AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    query: { bool: { filter: extendedFilter } },
    size: 1,
    fields: ['*'],
  };

  return dslQuery;
};
