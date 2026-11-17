/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedReport } from '../store';

/** Thrown instead of claiming a report that must not run again after an interrupted attempt. */
export class InterruptedReportError extends Error {
  constructor(public readonly report: SavedReport) {
    super(`Report ${report._id} did not record the outcome of attempt ${report.attempts}`);
  }
}
