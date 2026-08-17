/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderIntegration, AnalyzeAndImproveContext } from '../../types';

/**
 * Invokes the registered "Analyze & improve" chat opener. Resolves the opener via
 * `getAgentBuilderIntegration` at call time (so a late-registered opener still fires) and is a
 * no-op when none is registered (the button that triggers this is hidden in that case).
 */
export const analyzeAndImprove = (
  getAgentBuilderIntegration: (() => AgentBuilderIntegration | undefined) | undefined,
  context: AnalyzeAndImproveContext
): void => {
  getAgentBuilderIntegration?.()?.analyzeAndImprove.analyzeAndImprove(context);
};
