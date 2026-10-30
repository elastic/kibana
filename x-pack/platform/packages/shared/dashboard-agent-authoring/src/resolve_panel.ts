/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import type { ESQLControlVariable } from '@kbn/esql-types';

/**
 * Type-agnostic primitives for inline panel content resolution: the resolution
 * result and the request fields shared by every panel type.
 * Each renderer contributes its own request shape (see `panels/<type>`),
 * and the panels barrel aggregates them into the `ResolvePanelContent` contract,
 * which the host implements and injects.
 */

/** Resolved panel content: the embeddable `type` plus its by-value `config`. */
export type PanelContent = Pick<AttachmentPanel, 'type' | 'config'>;

export type PanelContentAttempt =
  | {
      type: 'success';
      panelContent: PanelContent;
      authoringNote?: string;
    }
  | {
      type: 'failure';
      error: string;
    };

/** One-sentence note describing a chart authored during the current turn. */
export interface PanelAuthoringNote {
  panelId: string;
  authoringNote: string;
}

/**
 * Fields common to every panel resolution request, independent of renderer.
 * Per-renderer modules extend this with a `renderer` discriminator and their
 * own payload (e.g. `panels/vis` adds the natural-language / ES|QL fields).
 */
/**
 * Gives the values of the dashboard's ES|QL controls that the queries refer to, ready to bind. Lazy,
 * since reading a control's value can take a request, so a panel asks only for what it runs.
 * `anyVariable` is for a query that is not written yet, which can refer to any of them.
 */
export type ResolveEsqlVariables = (
  queries: readonly string[],
  options?: { anyVariable?: boolean }
) => Promise<ESQLControlVariable[]>;

export interface PanelResolutionRequestBase {
  /** Present when editing an existing panel; upsert has checked it matches the renderer. */
  existingPanel?: AttachmentPanel;
  /** Gives the values of the dashboard's ES|QL controls that a query refers to (`?name`). */
  resolveEsqlVariables?: ResolveEsqlVariables;
}
