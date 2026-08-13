/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyzeAndImproveContext, ChatOpener } from '../../types';

/**
 * Invokes the "Analyze & improve" chat opener. Resolves the opener via `getChatOpener` at call
 * time and is a no-op when none is available (the button that triggers this is hidden in that
 * case).
 */
export const analyzeAndImprove = (
  getChatOpener: (() => ChatOpener | undefined) | undefined,
  context: AnalyzeAndImproveContext
): void => {
  getChatOpener?.()?.(context);
};
