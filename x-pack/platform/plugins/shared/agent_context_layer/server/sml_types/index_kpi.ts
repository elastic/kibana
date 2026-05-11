/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlTypeDefinition } from '../services/sml/types';

/**
 * SML attachment type id for KPIs that describe an Elasticsearch index.
 *
 * The bundled `workflow-sml-index-augmentation` workflow writes documents of
 * this type via the `agentContextLayer.smlIndexAttachment` step.
 *
 * Origin ids are composite — `<indexPattern>::<kpiName>` — so each KPI is its
 * own chunk and can be surfaced individually in semantic search results.
 */
export const INDEX_KPI_SML_TYPE = 'index_kpi';

/**
 * SML type definition for `index_kpi`.
 *
 * The type is fed exclusively through direct writes from the index-augmentation
 * workflow (using `source: 'direct'`). It therefore implements:
 *   - `list`: a no-op async iterable (the crawler has nothing to enumerate).
 *   - `getSmlData`: returns `undefined` (no resolver path; direct chunks win).
 *   - `toAttachment`: returns `undefined` (agents see the chunk content from
 *     semantic search; no dedicated attachment renderer is registered yet).
 *
 * These hooks are mandatory on `SmlTypeDefinition`; keeping them no-op is the
 * canonical pattern for workflow-fed types.
 */
export const indexKpiSmlType: SmlTypeDefinition = {
  id: INDEX_KPI_SML_TYPE,

  async *list() {
    // Workflow-fed only — nothing to enumerate.
  },

  getSmlData: async () => undefined,

  toAttachment: async () => undefined,
};
