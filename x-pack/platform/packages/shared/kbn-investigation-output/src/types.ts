/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationState } from '@kbn/significant-events-schema';

export interface InvestigationOutputProps {
  /** Whether the investigation is still running. There is no separate success/failed enum —
   * once settled, success vs. failure is conveyed entirely by `state` (present, no error) vs.
   * `error` (present). */
  isRunning: boolean;
  /** Current (while running) or final (once settled) investigation state. */
  state?: InvestigationState;
  /** Set when the investigation failed, or its result couldn't be loaded. */
  error?: string;
  /**
   * Called when the user asks to see what the investigation did. When omitted, the
   * component expands an inline panel with extra detail (conclusion, gaps found) instead.
   */
  onOpenDetails?: () => void;
}
