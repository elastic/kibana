/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm } from '@elastic/apm-rum';

type LabelValue = string | number | boolean | null | undefined;

export interface ReportEsqlViewsErrorOptions {
  errorType: string;
  labels?: Record<string, LabelValue>;
}

/** Reports an error that is swallowed rather than surfaced to the user. */
export const reportEsqlViewsError = (
  error: unknown,
  { errorType, labels }: ReportEsqlViewsErrorOptions
): void => {
  const captured = error instanceof Error ? error : new Error(String(error));
  apm.captureError(captured, {
    labels: { app: 'esql_views', error_type: errorType, ...labels },
  });
};
