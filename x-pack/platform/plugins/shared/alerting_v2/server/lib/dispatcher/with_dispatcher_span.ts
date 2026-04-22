/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';

export type DispatcherSpanLabels = Record<string, string | number | boolean>;

/**
 * Wrap an async operation in an APM span tagged for the dispatcher.
 *
 * `labelsFactory` is invoked after `cb` resolves and is intended to derive
 * cardinality-safe, aggregatable labels (counts, booleans) from the step's
 * output. Labels are attached to the span created by `withSpan` on a
 * best-effort basis; any failure while computing or applying labels is
 * swallowed and never affects the wrapped callback's result.
 */
export async function withDispatcherSpan<T>(
  name: string,
  cb: () => Promise<T>,
  labelsFactory?: (result: T) => DispatcherSpanLabels
): Promise<T> {
  return withSpan(
    { name: `dispatcher:${name}`, type: 'dispatcher', labels: { plugin: 'alerting_v2' } },
    async (span) => {
      const result = await cb();
      if (labelsFactory && span) {
        try {
          span.addLabels(labelsFactory(result));
        } catch {
          // best-effort: never let label failures affect pipeline correctness
        }
      }
      return result;
    }
  );
}
