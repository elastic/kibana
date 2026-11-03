/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserToolDefinition } from '@kbn/agent-builder-browser';
import { builtinBrowserToolIds, fillFormSchema } from '@kbn/agent-builder-common';
import { flushUpdates } from './flush_updates';
import { getBuiltinDescription } from './get_description';
import { setNativeValue } from './set_native_value';
import { takeSnapshot } from './snapshot/take_snapshot';
import type { BuiltinToolDeps } from './types';

interface FillFormParams {
  fields: Array<{ ref: string; value: string }>;
}

type FieldStatus = 'filled' | 'stale_ref' | 'not_fillable';

export const createFillFormTool = (
  deps: BuiltinToolDeps
): BrowserToolDefinition<FillFormParams> => ({
  id: builtinBrowserToolIds.fillForm,
  description: getBuiltinDescription(builtinBrowserToolIds.fillForm),
  schema: fillFormSchema as BrowserToolDefinition<FillFormParams>['schema'],
  handler: async ({ fields }, { signal }) => {
    const results: Array<{ ref: string; status: FieldStatus }> = [];
    for (const { ref, value } of fields) {
      if (signal.aborted) {
        throw new Error('aborted');
      }
      const element = deps.refStore.resolve(ref);
      let status: FieldStatus;
      if (!element) {
        status = 'stale_ref';
      } else {
        status = setNativeValue(element, value) ? 'filled' : 'not_fillable';
      }
      results.push({ ref, status });
    }
    if (results.every((r) => r.status !== 'filled')) {
      throw new Error('No field could be filled');
    }
    await flushUpdates();
    return { content: { fields: results, snapshot: await takeSnapshot(deps) } };
  },
});
