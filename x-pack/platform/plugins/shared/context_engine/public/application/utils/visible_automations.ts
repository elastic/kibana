/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDreamingAutomation } from '../../../common/dreaming';
import type { AiIndexAutomation } from '../../../common/http_api/ai_indices';

/** The automations the UI shows: dreaming automations are hidden while memory is off. */
export const getVisibleAutomations = (
  automations: readonly AiIndexAutomation[],
  isMemoryEnabled: boolean
): AiIndexAutomation[] =>
  isMemoryEnabled
    ? [...automations]
    : automations.filter((automation) => !isDreamingAutomation(automation));

/** Workflow ids of the visible automations. */
export const getVisibleWorkflowIds = (
  automations: readonly AiIndexAutomation[],
  isMemoryEnabled: boolean
): string[] =>
  getVisibleAutomations(automations, isMemoryEnabled)
    .filter((automation) => automation.type === 'workflow')
    .map((automation) => automation.value);
