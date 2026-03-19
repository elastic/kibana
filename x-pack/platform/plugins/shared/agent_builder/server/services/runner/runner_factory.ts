/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { RunnerFactoryDeps, RunnerFactory, ScopedRunnerWithAttachments } from './types';
import { createModelProviderFactory } from './model_provider';
import { createRunner, createScopedRunner, type CreateRunnerDeps } from './runner';
import { createStore } from './store';
import { createConversationStateManager, createToolManager } from './utils';
import { createPromptManager } from './utils/prompts';

export class RunnerFactoryImpl implements RunnerFactory {
  private readonly deps: RunnerFactoryDeps;

  constructor(deps: RunnerFactoryDeps) {
    this.deps = deps;
  }

  getRunner() {
    return createRunner(this.createRunnerDeps());
  }

  async createScopedRunnerWithAttachments({
    request,
    attachments,
  }: {
    request: KibanaRequest;
    attachments: VersionedAttachment[];
  }): Promise<ScopedRunnerWithAttachments> {
    const runnerDeps = this.createRunnerDeps();
    const { modelProviderFactory, ...otherDeps } = runnerDeps;

    const { resultStore, filestore, skillsStore } = createStore({});
    const attachmentStateManager = createAttachmentStateManager(attachments, {
      getTypeDefinition: otherDeps.attachmentsService.getTypeDefinition,
    });
    const stateManager = createConversationStateManager();
    const promptManager = createPromptManager({});
    const toolManager = createToolManager();
    const modelProvider = modelProviderFactory({ request });

    const runner = createScopedRunner({
      ...otherDeps,
      modelProvider,
      request,
      resultStore,
      skillsStore,
      attachmentStateManager,
      stateManager,
      promptManager,
      filestore,
      toolManager,
    });

    return { runner, attachmentStateManager };
  }

  private createRunnerDeps(): CreateRunnerDeps {
    const {
      inference,
      trackingService,
      analyticsService,
      uiSettings,
      hooks,
      savedObjects,
      ...otherDeps
    } = this.deps;
    return {
      ...otherDeps,
      savedObjects,
      uiSettings,
      trackingService,
      analyticsService,
      hooks,
      modelProviderFactory: createModelProviderFactory({
        inference,
        trackingService,
        uiSettings,
        savedObjects,
      }),
    };
  }
}
