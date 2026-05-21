/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { WorkflowExtensionsService } from './workflow_extensions_service';

describe('WorkflowExtensionsService', () => {
  it('emitEvent delegates to the injected workflows client', async () => {
    const start = workflowsExtensionsMock.createStart();
    const emitEvent = jest.fn().mockResolvedValue(undefined);
    start.getClient.mockResolvedValue({
      isWorkflowsAvailable: true,
      emitEvent,
    });

    const client = await start.getClient(httpServerMock.createKibanaRequest());
    const service = new WorkflowExtensionsService(client);

    await service.emitEvent('some.trigger', { a: 1 });

    expect(emitEvent).toHaveBeenCalledWith('some.trigger', { a: 1 });
  });
});
