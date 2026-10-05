/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';

/**
 * Behavior for a panel type the agent authors by value (`source: 'config'`).
 *
 * Each by-value type's module (`panels/<type>`) exports one of these and
 * registers it in `CONFIG_PANEL_TYPES` (see `panels/index.ts`), so operations
 * stay type-agnostic. Panels generated server-side use `source: 'request'` and a
 * resolver instead.
 */
export interface ConfigPanelTypeDefinition {
  /** Embeddable type id panels of this type map to. Edits may only target panels of this type. */
  readonly embeddableType: string;
  /** Human-readable name used in error messages, e.g. "anomaly charts". */
  readonly label: string;
  /** Maps the agent-facing config onto the embeddable's stored config. Defaults to passing it through. */
  readonly toEmbeddableConfig?: (config: AttachmentPanel['config']) => AttachmentPanel['config'];
}
