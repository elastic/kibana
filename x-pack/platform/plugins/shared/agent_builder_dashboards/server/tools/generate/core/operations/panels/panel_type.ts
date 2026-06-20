/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';

/** Resolved panel content: the embeddable `type` plus its by-value `config`. */
export type PanelContent = Pick<AttachmentPanel, 'type' | 'config'>;

/** Outcome of validating whether an existing panel can be edited by config. */
export type ConfigEditValidation = { ok: true } | { ok: false; error: string };

/**
 * Static, host-agnostic behavior for a single panel `type`.
 *
 * Each type's module (`panels/<type>`) exports one of these so the operations
 * can stay type-agnostic: they look the definition up in the registry instead of
 * branching on the literal type, and adding a panel type means adding its module
 * plus a registry entry — no operation edits.
 *
 * This covers the *by-value config* path only (`source: 'config'` add/edit).
 * Creating a panel from an async request (e.g. natural language / ES|QL) is a
 * separate seam handled by the panel resolver dispatcher.
 */
export interface PanelTypeDefinition {
  /** Embeddable type id panels of this type map to. */
  readonly embeddableType: string;
  /** Builds panel content from an already-resolved `source: 'config'` config. */
  readonly buildPanelContent: (config: AttachmentPanel['config']) => PanelContent;
  /**
   * Validates that an existing panel may be replaced via a `source: 'config'`
   * edit of this type. Omit for types that are not editable by config (e.g.
   * `vis`, which edits through `source: 'request'` instead).
   */
  readonly validateConfigEdit?: (existingPanel: AttachmentPanel) => ConfigEditValidation;
}
