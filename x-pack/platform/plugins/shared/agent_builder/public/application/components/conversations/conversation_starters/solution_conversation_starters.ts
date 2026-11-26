/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationStarter } from '@kbn/agent-builder-common';
import type { SolutionView } from '@kbn/spaces-plugin/common';

/**
 * The starters of each solution, shown on the default Elastic AI agent when the space has that
 * solution view. An empty list means the solution has no set yet, so the default list is shown.
 * The team of a solution adds its set here, by PR. Every label, and every optional prompt, is a
 * translated string, a label has up to 30 characters, and every starter must relate to a capability
 * the agent has out of the box. At most 3 are shown.
 *
 * Typed by solution so that a new solution can't be forgotten.
 */
export const SOLUTION_CONVERSATION_STARTERS: Record<SolutionView, readonly ConversationStarter[]> =
  {
    classic: [],
    oblt: [],
    security: [],
    es: [],
    vectordb: [],
  };

export const getSolutionConversationStarters = (
  solution: SolutionView
): readonly ConversationStarter[] => SOLUTION_CONVERSATION_STARTERS[solution] ?? [];
