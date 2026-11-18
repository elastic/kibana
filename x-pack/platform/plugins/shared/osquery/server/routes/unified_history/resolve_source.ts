/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { LiveHistoryRow, SourceFilter } from '../../../common/api/unified_history/types';
import type { LiveActionHit } from './map_live_hit_to_row';

export const resolveSource = ({
  fields = {},
  _source = {},
}: LiveActionHit): LiveHistoryRow['source'] => {
  const originTypeRaw = fields['origin.type'] ?? _source.origin?.type;
  const originType = Array.isArray(originTypeRaw) ? originTypeRaw[0] : originTypeRaw;
  if (originType === 'workflow') {
    return 'Workflow';
  }

  const alertIds = fields.alert_ids ?? _source.alert_ids;
  const hasAlertIds = Array.isArray(alertIds) ? alertIds.length > 0 : !!alertIds;

  return hasAlertIds ? 'Rule' : 'Live';
};

export const buildSourceClause = (
  source: Exclude<SourceFilter, 'scheduled'>
): estypes.QueryDslQueryContainer => {
  // Older actions have no `origin`: `term` skips them and `must_not` keeps them, so they still
  // resolve to Live or Rule without a reindex.
  const workflowClause = { term: { 'origin.type': 'workflow' } };
  if (source === 'workflow') {
    return workflowClause;
  }

  const alertIdsClause = { exists: { field: 'alert_ids' } };
  if (source === 'rule') {
    return {
      bool: {
        filter: [alertIdsClause],
        must_not: [workflowClause],
      },
    };
  }

  return {
    bool: {
      must_not: [alertIdsClause, workflowClause],
    },
  };
};
