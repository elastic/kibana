/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ResultEdges } from '../../common/search_strategy';

/**
 * Enrich edges with error/expired states immutably.
 * Shared between legacy and unified action results components.
 */
export function enrichEdgesWithErrors(
  edges: ResultEdges,
  error: string | undefined,
  expired: boolean
): ResultEdges {
  return edges.map((edge) => {
    if (edge.fields?.error || edge.fields?.['error.skipped'] || edge.fields?.completed_at) {
      return edge;
    }

    const fields = { ...(edge.fields || {}) };

    if (error) {
      fields['error.skipped'] = [error];
      fields.error = [error];
    } else if (expired && !edge.fields?.completed_at) {
      const expiredMessage = i18n.translate(
        'xpack.osquery.liveQueryActionResults.table.expiredErrorText',
        { defaultMessage: 'The action request timed out.' }
      );
      fields['error.keyword'] = [expiredMessage];
      fields.error = [expiredMessage];
    }

    return { ...edge, fields };
  }) as ResultEdges;
}
