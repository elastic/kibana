/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import {
  CaseCreatedTriggerId,
  CaseUpdatedTriggerId,
  CommentAddedTriggerId,
} from '../../../common/workflows/triggers';
import { CasesEventBus } from '../../events';
import { registerCasesWorkflowEventBridge } from './event_bridge';

const flushMicrotasks = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

describe('registerCasesWorkflowEventBridge', () => {
  it('forwards cases events to workflows extensions', async () => {
    const eventBus = new CasesEventBus();
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    const logger = loggingSystemMock.createLogger();
    const request = httpServerMock.createKibanaRequest();

    registerCasesWorkflowEventBridge(eventBus, workflowsExtensions, logger);

    eventBus.emitCaseCreated(
      { request, spaceId: 'default', source: 'api' },
      { case: { id: 'case-1' } }
    );
    eventBus.emitCaseUpdated(
      { request, spaceId: 'default', source: 'api' },
      { case: { id: 'case-1' }, updatedFields: ['status'] }
    );
    eventBus.emitCommentAdded(
      { request, spaceId: 'default', source: 'api' },
      { case: { id: 'case-1' }, commentType: 'user' }
    );

    await flushMicrotasks();

    expect(workflowsExtensions.emitEvent).toHaveBeenCalledTimes(3);
    expect(workflowsExtensions.emitEvent).toHaveBeenNthCalledWith(1, {
      triggerId: CaseCreatedTriggerId,
      payload: { case: { id: 'case-1' } },
      request,
      spaceId: 'default',
    });
    expect(workflowsExtensions.emitEvent).toHaveBeenNthCalledWith(2, {
      triggerId: CaseUpdatedTriggerId,
      payload: { case: { id: 'case-1' }, updatedFields: ['status'] },
      request,
      spaceId: 'default',
    });
    expect(workflowsExtensions.emitEvent).toHaveBeenNthCalledWith(3, {
      triggerId: CommentAddedTriggerId,
      payload: { case: { id: 'case-1' }, commentType: 'user' },
      request,
      spaceId: 'default',
    });
  });

  it('does not forward events emitted from workflow steps', async () => {
    const eventBus = new CasesEventBus();
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    const logger = loggingSystemMock.createLogger();
    const request = httpServerMock.createKibanaRequest();

    registerCasesWorkflowEventBridge(eventBus, workflowsExtensions, logger);

    eventBus.emitCaseCreated(
      { request, spaceId: 'default', source: 'workflowStep' },
      { case: { id: 'case-1' } }
    );

    await flushMicrotasks();

    expect(workflowsExtensions.emitEvent).not.toHaveBeenCalled();
  });

  it('logs warning when forwarding fails', async () => {
    const eventBus = new CasesEventBus();
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    const logger = loggingSystemMock.createLogger();
    const request = httpServerMock.createKibanaRequest();

    workflowsExtensions.emitEvent.mockRejectedValue(new Error('boom'));
    registerCasesWorkflowEventBridge(eventBus, workflowsExtensions, logger);

    eventBus.emitCaseCreated(
      { request, spaceId: 'default', source: 'api' },
      { case: { id: 'case-1' } }
    );

    await flushMicrotasks();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to emit workflow trigger "${CaseCreatedTriggerId}"`)
    );
  });
});
