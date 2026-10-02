/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { registerWorkflowSteps } from '.';

const GA_STEP_IDS = [
  'ai.conversation.metadata.read',
  'ai.conversation.metadata.patch',
  'ai.conversation.add_event',
  'ai.conversation.add_user_message',
  'ai.attachment.add',
  'ai.attachment.update',
  'ai.attachment.delete',
  'ai.attachment.read',
  'ai.attachment.list',
];

const loadRegisteredStepIds = async (): Promise<string[]> => {
  const core = coreMock.createSetup();
  const [coreStart] = await core.getStartServices();
  (coreStart.uiSettings.get as jest.Mock).mockReturnValue(false);

  const loaders: Array<() => Promise<unknown>> = [];
  const workflowsExtensions = {
    registerStepDefinition: jest.fn((loader: () => Promise<unknown>) => loaders.push(loader)),
    registerTriggerDefinition: jest.fn(),
  } as unknown as WorkflowsExtensionsPublicPluginSetup;

  registerWorkflowSteps(workflowsExtensions, core);

  const results = await Promise.allSettled(loaders.map((loader) => loader()));
  return results.flatMap((result) =>
    result.status === 'fulfilled' && result.value ? [(result.value as { id: string }).id] : []
  );
};

describe('registerWorkflowSteps', () => {
  it('registers the conversation and attachment steps when experimental features are off', async () => {
    const ids = await loadRegisteredStepIds();

    expect(ids).toEqual(expect.arrayContaining(GA_STEP_IDS));
  });
});
