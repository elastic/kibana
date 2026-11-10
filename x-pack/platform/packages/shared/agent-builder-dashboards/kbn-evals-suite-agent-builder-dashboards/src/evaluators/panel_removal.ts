/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import {
  getLeafPanels,
  getPanelKind,
  getPanelQueries,
  getPanelQueryKey,
} from '../dashboard_panels';
import type { EnhanceMode } from '../extract_dashboard';

export interface PanelRemovals {
  /** Seed panel ids missing from the result. */
  removed: string[];
  /** Removed ids the enhance rules do not allow removing in this mode. */
  disallowed: string[];
}

/**
 * Which seed panels the result dropped, and which of those drops the mode
 * allows. Both modes may drop markdown: deleting a narrating text panel is as
 * good as rewriting it. Content mode may also drop all but one copy of a
 * duplicate, whichever copy stays.
 */
export const findPanelRemovals = (
  seed: DashboardAttachmentData,
  result: DashboardAttachmentData,
  mode: EnhanceMode
): PanelRemovals => {
  const resultIds = new Set(getLeafPanels(result).map(({ id }) => id));
  const seedPanels = getLeafPanels(seed);
  const removed = seedPanels.filter(({ id }) => !resultIds.has(id));

  const survivingQueryKeys = new Set(
    seedPanels
      .filter(({ id }) => resultIds.has(id))
      .map(getPanelQueries)
      .filter((queries) => queries.length > 0)
      .map(getPanelQueryKey)
  );

  const disallowed = removed.filter((panel) => {
    if (getPanelKind(panel) === 'markdown') {
      return false;
    }
    if (mode === 'appearance') {
      return true;
    }
    const queries = getPanelQueries(panel);
    return queries.length === 0 || !survivingQueryKeys.has(getPanelQueryKey(queries));
  });

  return { removed: removed.map(({ id }) => id), disallowed: disallowed.map(({ id }) => id) };
};
