/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyzeAndImproveContext, ChatOpener } from '../../types';

/** Invokes the Analyze & improve chat opener, or no-ops when none is available. */
export const analyzeAndImprove = (
  getChatOpener: (() => ChatOpener | undefined) | undefined,
  context: AnalyzeAndImproveContext
): void => {
  getChatOpener?.()?.(context);
};
