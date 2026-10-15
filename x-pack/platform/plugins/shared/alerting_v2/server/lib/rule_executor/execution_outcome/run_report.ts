/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * When a run throws, metrics and rule data might have already have been captured.
 *
 * This data needs to be passed to the task runner so that it can be reported to
 * the Task Manager.
 *
 * Errors travel through framework code that may log or serialize it, so we only pass
 * data that is safe to report.
 */
export interface RunReport {
  readonly ruleVersion?: number;
  readonly counters: Readonly<Record<string, number>>;
}

const runReport = Symbol('AlertingRuleExecutionRunReport');

interface ReportTaggedError extends Error {
  [runReport]?: RunReport;
}

/**
 * Carries a throwing run's reportable values out to the task runner, by
 * decorating the error in place and returning the same instance.
 *
 * First write wins, and non-`Error` throws cannot be tagged and pass through
 * untouched. Non-`Error` throws are not reported to the Task Manager.
 */
export const tagRunReport = <T>(error: T, report: RunReport): T => {
  if (error instanceof Error && (error as ReportTaggedError)[runReport] === undefined) {
    (error as ReportTaggedError)[runReport] = report;
  }

  return error;
};

/** Returns the reportable values for a thrown error, when the error carries a tag. */
export const getRunReport = (error: unknown): RunReport | undefined =>
  error instanceof Error ? (error as ReportTaggedError)[runReport] : undefined;
