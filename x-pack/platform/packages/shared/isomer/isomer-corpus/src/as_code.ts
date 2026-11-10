/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A panel or a section in a dashboard's as-code `panels` array (`GET /api/dashboards/{id}`). */
export interface AsCodePanelEntry {
  id?: string;
  type?: string;
  title?: string;
  grid?: Record<string, number>;
  config?: Record<string, unknown>;
  panels?: AsCodePanelEntry[];
  collapsed?: boolean;
}

export interface AsCodePanel {
  id: string;
  type: string;
  grid: Record<string, number>;
  config: Record<string, unknown>;
  /** The section that holds the panel, if any. */
  sectionId?: string;
  /** Collapsed sections don't render their panels, so there is nothing to capture. */
  inCollapsedSection: boolean;
}

/** Flattens top-level panels and section panels, in the order the API returns them. */
export const flattenAsCodePanels = (entries: readonly AsCodePanelEntry[] = []): AsCodePanel[] =>
  entries.flatMap((entry) => {
    if (Array.isArray(entry.panels)) {
      return entry.panels.map((panel) => ({
        ...toPanel(panel),
        sectionId: entry.id,
        inCollapsedSection: Boolean(entry.collapsed),
      }));
    }
    return [toPanel(entry)];
  });

const toPanel = ({
  id = '',
  type = '',
  grid = {},
  config = {},
}: AsCodePanelEntry): AsCodePanel => ({
  id,
  type,
  grid,
  config,
  inCollapsedSection: false,
});

/** A by-reference Lens panel carries `ref_id`; its config comes from `GET /api/visualizations/{id}`. */
export const getVisualizationRefId = ({ type, config }: AsCodePanel): string | undefined => {
  const refId = config.ref_id;
  return type === 'vis' && typeof refId === 'string' ? refId : undefined;
};

/** Saved object bookkeeping in an as-code response's `meta`; it changes on every write. */
const VOLATILE_META_KEYS = ['created_at', 'updated_at', 'version'] as const;

/**
 * Drops `meta.created_at`, `meta.updated_at` and `meta.version` from an as-code API response, so a
 * capture of unchanged content is byte-for-byte the same on every run.
 */
export const withoutVolatileMeta = <T extends { meta?: Record<string, unknown> }>(
  response: T
): T => {
  if (!response.meta) {
    return response;
  }
  const meta = { ...response.meta };
  for (const key of VOLATILE_META_KEYS) {
    delete meta[key];
  }
  return { ...response, meta };
};
