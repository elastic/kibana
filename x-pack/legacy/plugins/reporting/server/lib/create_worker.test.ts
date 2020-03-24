/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchServiceSetup } from 'kibana/server';
import * as sinon from 'sinon';
import { ReportingCore } from '../../server';
import { createMockReportingCore } from '../../test_helpers';
import { ServerFacade } from '../../types';
import { createWorkerFactory } from './create_worker';
// @ts-ignore
import { Esqueue } from './esqueue';
// @ts-ignore
import { ClientMock } from './esqueue/__tests__/fixtures/legacy_elasticsearch';
import { ExportTypesRegistry } from './export_types_registry';

const configGetStub = sinon.stub();
configGetStub.withArgs('xpack.reporting.queue').returns({
  pollInterval: 3300,
  pollIntervalErrorMultiplier: 10,
});
configGetStub.withArgs('server.name').returns('test-server-123');
configGetStub.withArgs('server.uuid').returns('g9ymiujthvy6v8yrh7567g6fwzgzftzfr');

const executeJobFactoryStub = sinon.stub();

const getMockServer = (): ServerFacade => {
  return ({
    config: () => ({ get: configGetStub }),
  } as unknown) as ServerFacade;
};
const getMockLogger = jest.fn();

const getMockExportTypesRegistry = (
  exportTypes: any[] = [{ executeJobFactory: executeJobFactoryStub }]
) =>
  ({
    getAll: () => exportTypes,
  } as ExportTypesRegistry);

describe('Create Worker', () => {
  let queue: Esqueue;
  let client: ClientMock;
  let mockReporting: ReportingCore;

  beforeEach(async () => {
    mockReporting = await createMockReportingCore();
    client = new ClientMock();
    queue = new Esqueue('reporting-queue', { client });
    executeJobFactoryStub.reset();
  });

  test('Creates a single Esqueue worker for Reporting', async () => {
    mockReporting.getExportTypesRegistry = () => getMockExportTypesRegistry();
    const createWorker = createWorkerFactory(
      mockReporting,
      getMockServer(),
      {} as ElasticsearchServiceSetup,
      getMockLogger()
    );
    const registerWorkerSpy = sinon.spy(queue, 'registerWorker');

    await createWorker(queue);

    sinon.assert.callCount(executeJobFactoryStub, 1);
    sinon.assert.callCount(registerWorkerSpy, 1);

    const { firstCall } = registerWorkerSpy;
    const [workerName, workerFn, workerOpts] = firstCall.args;

    expect(workerName).toBe('reporting');
    expect(workerFn).toMatchInlineSnapshot(`[Function]`);
    expect(workerOpts).toMatchInlineSnapshot(`
Object {
  "interval": 3300,
  "intervalErrorMultiplier": 10,
  "kibanaId": "g9ymiujthvy6v8yrh7567g6fwzgzftzfr",
  "kibanaName": "test-server-123",
}
`);
  });

  test('Creates a single Esqueue worker for Reporting, even if there are multiple export types', async () => {
    const exportTypesRegistry = getMockExportTypesRegistry([
      { executeJobFactory: executeJobFactoryStub },
      { executeJobFactory: executeJobFactoryStub },
      { executeJobFactory: executeJobFactoryStub },
      { executeJobFactory: executeJobFactoryStub },
      { executeJobFactory: executeJobFactoryStub },
    ]);
    mockReporting.getExportTypesRegistry = () => exportTypesRegistry;
    const createWorker = createWorkerFactory(
      mockReporting,
      getMockServer(),
      {} as ElasticsearchServiceSetup,
      getMockLogger()
    );
    const registerWorkerSpy = sinon.spy(queue, 'registerWorker');

    await createWorker(queue);

    sinon.assert.callCount(executeJobFactoryStub, 5);
    sinon.assert.callCount(registerWorkerSpy, 1);

    const { firstCall } = registerWorkerSpy;
    const [workerName, workerFn, workerOpts] = firstCall.args;

    expect(workerName).toBe('reporting');
    expect(workerFn).toMatchInlineSnapshot(`[Function]`);
    expect(workerOpts).toMatchInlineSnapshot(`
Object {
  "interval": 3300,
  "intervalErrorMultiplier": 10,
  "kibanaId": "g9ymiujthvy6v8yrh7567g6fwzgzftzfr",
  "kibanaName": "test-server-123",
}
`);
  });
});
