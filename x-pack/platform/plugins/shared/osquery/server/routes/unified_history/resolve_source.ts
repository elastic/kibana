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
  const dispatchSourceRaw = fields.dispatch_source ?? _source.dispatch_source;
  const dispatchSource = Array.isArray(dispatchSourceRaw) ? dispatchSourceRaw[0] : dispatchSourceRaw;
  if (dispatchSource === 'workflow') {
    return 'Workflow';
  }

  const alertIds = fields.alert_ids ?? _source.alert_ids;
  const hasAlertIds = Array.isArray(alertIds) ? alertIds.length > 0 : !!alertIds;

  return hasAlertIds ? 'Rule' : 'Live';
};

export const buildSourceClause = (
  source: Exclude<SourceFilter, 'scheduled'>
): estypes.QueryDslQueryContainer => {
  const workflowClause = { term: { dispatch_source: 'workflow' } };
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
