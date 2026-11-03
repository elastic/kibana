/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserToolDefinition } from '@kbn/agent-builder-browser';
import { builtinBrowserToolIds, clickElementSchema } from '@kbn/agent-builder-common';
import { flushUpdates } from './flush_updates';
import { getBuiltinDescription } from './get_description';
import { accessibleName } from './snapshot/accessible_name';
import { takeSnapshot } from './snapshot/take_snapshot';
import type { BuiltinToolDeps } from './types';

export const createClickElementTool = (
  deps: BuiltinToolDeps
): BrowserToolDefinition<{ ref: string }> => ({
  id: builtinBrowserToolIds.clickElement,
  description: getBuiltinDescription(builtinBrowserToolIds.clickElement),
  schema: clickElementSchema as BrowserToolDefinition<{ ref: string }>['schema'],
  handler: async ({ ref }, { signal }) => {
    const element = deps.refStore.resolve(ref);
    if (!element) {
      throw new Error(`Stale or unknown ref "${ref}": take a new snapshot`);
    }
    if (signal.aborted) {
      throw new Error('aborted');
    }
    const clicked = accessibleName(element);
    if ((element as HTMLButtonElement).disabled === true) {
      return { content: { clicked, snapshot: await takeSnapshot(deps), disabled: true } };
    }
    element.scrollIntoView?.({ block: 'center' });
    (element as HTMLElement).click();
    await flushUpdates();
    return { content: { clicked, snapshot: await takeSnapshot(deps) } };
  },
});
