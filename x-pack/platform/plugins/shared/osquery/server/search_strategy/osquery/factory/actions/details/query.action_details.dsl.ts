/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import { getQueryFilter } from '../../../../../utils/build_query';
import { ACTIONS_INDEX } from '../../../../../../common/constants';
import type { ActionDetailsRequestOptions } from '../../../../../../common/search_strategy';

export const buildActionDetailsQuery = ({
  actionId,
  kuery,
  componentTemplateExists,
}: ActionDetailsRequestOptions): ISearchRequestParams => {
  const kueryFilter = kuery ? [getQueryFilter({ filter: kuery })] : [];

  // Space scoping is enforced centrally in the search strategy (enforceSpaceScope).
  const dslQuery = {
    allow_no_indices: true,
    index: [componentTemplateExists ? `${ACTIONS_INDEX}*` : AGENT_ACTIONS_INDEX],
    ignore_unavailable: true,
    query: { bool: { filter: [{ term: { action_id: actionId } }, ...kueryFilter] } },
    size: 1,
    fields: ['*'],
  };

  return dslQuery;
};
