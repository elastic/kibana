/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { LensApiSchemaType } from '@kbn/lens-embeddable-utils/config_builder';
import type { Action, PlannedPanel } from '../types';

/** Represents a field from index mappings */
export interface IndexField {
  name: string;
  type: string;
}

/** State annotation for the build dashboard graph */
export const BuildDashboardStateAnnotation = Annotation.Root({
  // Inputs
  query: Annotation<string>(),
  title: Annotation<string>(),
  description: Annotation<string>(),
  index: Annotation<string | undefined>(),

  // Discovery phase
  discoveredIndex: Annotation<string | undefined>({
    reducer: (_, newValue) => newValue,
    default: () => undefined,
  }),
  indexFields: Annotation<IndexField[]>({
    reducer: (_, newValue) => newValue,
    default: () => [],
  }),

  // Planning phase
  plannedPanels: Annotation<PlannedPanel[]>({
    reducer: (_, newValue) => newValue,
    default: () => [],
  }),
  markdownContent: Annotation<string>({
    reducer: (_, newValue) => newValue,
    default: () => '',
  }),

  // Progress tracking
  currentPanelIndex: Annotation<number>({
    reducer: (_, newValue) => newValue,
    default: () => 0,
  }),
  createdPanels: Annotation<LensApiSchemaType[]>({
    reducer: (prev, newValue) => [...prev, ...newValue],
    default: () => [],
  }),

  // Internal state
  currentAttempt: Annotation<number>({
    reducer: (_, newValue) => newValue,
    default: () => 0,
  }),
  actions: Annotation<Action[]>({
    reducer: (prev, newValue) => [...prev, ...newValue],
    default: () => [],
  }),

  // Output
  dashboardUrl: Annotation<string | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),
  error: Annotation<string | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),
});

export type BuildDashboardState = typeof BuildDashboardStateAnnotation.State;
