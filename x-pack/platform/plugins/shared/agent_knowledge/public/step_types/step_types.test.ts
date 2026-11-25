/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { RecallPageStepId, RecordEntryStepId } from '../../common';
import { registerAgentKnowledgePublicStepDefinitions } from '.';

type Loader = () => Promise<{ icon?: unknown; id: string }>;

const register = (): Loader[] => {
  const registerStepDefinition = jest.fn();
  registerAgentKnowledgePublicStepDefinitions({
    registerStepDefinition,
  } as unknown as WorkflowsExtensionsPublicPluginSetup);
  return registerStepDefinition.mock.calls.map(([definition]) => definition as Loader);
};

describe('agentKnowledge public step definitions', () => {
  it('registers every server step for the editor, each as a loader with an icon', async () => {
    const loaders = register();
    expect(loaders.every((loader) => typeof loader === 'function')).toBe(true);

    const resolved = await Promise.all(loaders.map((load) => load()));

    expect(resolved.map(({ id }) => id)).toEqual([RecallPageStepId, RecordEntryStepId]);
    resolved.forEach((definition) => expect(definition).toHaveProperty('icon'));
  });
});
