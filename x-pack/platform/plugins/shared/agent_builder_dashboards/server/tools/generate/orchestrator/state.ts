/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { TrackedPanelFailure } from '../core/utils';
import type { Action } from './types';

/** Placeholder title of a fresh payload; the authoring agent replaces it during creation. */
export const DEFAULT_DASHBOARD_TITLE = 'User Dashboard';

export const emptyDashboard = (): DashboardAttachmentData => ({
  title: DEFAULT_DASHBOARD_TITLE,
  description: undefined,
  panels: [],
});

export const StateAnnotation = Annotation.Root({
  // inputs
  request: Annotation<string>(),
  additionalContext: Annotation<string | undefined>(),
  additionalInstructions: Annotation<string | undefined>(),
  /** The original dashboard being edited (undefined when creating). Stable across turns. */
  existingDashboard: Annotation<DashboardAttachmentData | undefined>(),
  /** Hard bound on tool-capable model turns; finalize may add one text-only response. */
  maxAgentTurns: Annotation<number>(),

  // working buffers
  dashboard: Annotation<DashboardAttachmentData>({
    reducer: (_a, b) => b,
    default: emptyDashboard,
  }),
  /** Terminal panel failures that the authoring agent has not yet recovered. */
  activeFailures: Annotation<Record<string, TrackedPanelFailure>>({
    reducer: (_a, b) => b,
    default: () => ({}),
  }),
  actions: Annotation<Action[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});

export type StateType = typeof StateAnnotation.State;
