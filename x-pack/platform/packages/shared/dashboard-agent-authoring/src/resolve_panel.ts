/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_FAILURE_TYPES } from './failure_types';
import type { DashboardFailure } from './utils';

/**
 * Type-agnostic primitives for inline panel content resolution: the resolution
 * result, the failure helper, and the request fields shared by every panel type.
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
      failure: DashboardFailure;
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
export interface PanelResolutionRequestBase {
  /** Human-facing identifier for failure attribution (panelId or the query). */
  identifier: string;
  /** Present when editing an existing panel; upsert has checked it matches the renderer. */
  existingPanel?: AttachmentPanel;
}

export const createPanelFailureResult = (
  identifier: string,
  error: string
): Extract<PanelContentAttempt, { type: 'failure' }> => ({
  type: 'failure',
  failure: {
    type: DASHBOARD_FAILURE_TYPES.upsertDashboard,
    identifier,
    error,
  },
});
