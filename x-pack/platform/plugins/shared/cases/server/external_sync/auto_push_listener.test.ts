/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { Case } from '../../common/types/domain';
import type { GetCaseConnectorsResponse } from '../../common/types/api';
import { ConnectorTypes } from '../../common/types/domain';
import { createCasesClientMock } from '../client/mocks';
import { mockCases } from '../mocks';
import { flattenCaseSavedObject } from '../common/utils';
import { CasesEventBus } from '../events/event_bus';
import { registerAutoPushListener } from './auto_push_listener';

const flush = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

const theCase: Case = {
  ...flattenCaseSavedObject({ savedObject: mockCases[0] }),
  connector: { id: 'sn-1', name: 'ServiceNow', type: ConnectorTypes.serviceNowITSM, fields: null },
  settings: { syncAlerts: true, externalSync: { autoPush: true, conflictStrategy: 'external' } },
};

const connectors = (needsToBePushed: boolean) =>
  ({
    'sn-1': {
      ...theCase.connector,
      push: { needsToBePushed, hasBeenPushed: true },
    },
  } as GetCaseConnectorsResponse);

describe('registerAutoPushListener', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();
  const casesClient = createCasesClientMock();
  const getCasesClient = jest.fn().mockResolvedValue(casesClient);
  const isAtLeastEnterprise = jest.fn().mockResolvedValue(true);
  let eventBus: CasesEventBus;

  const emitUpdate = (origin?: 'external_sync') =>
    eventBus.emitCaseUpdated(
      request,
      { caseId: theCase.id, owner: 'securitySolution', updatedFields: ['title'], origin },
      { previousCase: undefined, updatedCase: undefined }
    );

  beforeEach(() => {
    jest.clearAllMocks();
    isAtLeastEnterprise.mockResolvedValue(true);
    casesClient.cases.get.mockResolvedValue(theCase);
    casesClient.userActions.getConnectors.mockResolvedValue(connectors(true));
    casesClient.cases.push.mockResolvedValue(theCase);
    eventBus = new CasesEventBus(logger);
    registerAutoPushListener({
      casesEventBus: eventBus,
      getCasesClient,
      isAtLeastEnterprise,
      logger,
    });
  });

  it('pushes automatically when the case has auto-push on and needs a push', async () => {
    emitUpdate();
    await flush();

    expect(getCasesClient).toHaveBeenCalledWith(request);
    expect(casesClient.cases.push).toHaveBeenCalledWith({
      caseId: theCase.id,
      connectorId: 'sn-1',
      pushType: 'automatic',
    });
  });

  it('pushes on case creation and on new attachments', async () => {
    eventBus.emitCaseCreated(request, { caseId: theCase.id, owner: 'securitySolution' });
    await flush();
    eventBus.emitAttachmentsAdded(request, {
      caseId: theCase.id,
      owner: 'securitySolution',
      attachmentIds: ['c-1'],
      attachmentType: 'user',
    });
    await flush();

    expect(casesClient.cases.push).toHaveBeenCalledTimes(2);
  });

  it('does not push changes that were applied from the external incident', async () => {
    emitUpdate('external_sync');
    await flush();

    expect(getCasesClient).not.toHaveBeenCalled();
    expect(casesClient.cases.push).not.toHaveBeenCalled();
  });

  it('does not push when auto-push is off', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      settings: {
        syncAlerts: true,
        externalSync: { autoPush: false, conflictStrategy: 'external' },
      },
    });

    emitUpdate();
    await flush();

    expect(casesClient.cases.push).not.toHaveBeenCalled();
  });

  it('does not push when the case has no connector', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...theCase,
      connector: { id: 'none', name: 'none', type: ConnectorTypes.none, fields: null },
    });

    emitUpdate();
    await flush();

    expect(casesClient.userActions.getConnectors).not.toHaveBeenCalled();
    expect(casesClient.cases.push).not.toHaveBeenCalled();
  });

  it('does not push when the incident is already up to date', async () => {
    casesClient.userActions.getConnectors.mockResolvedValue(connectors(false));

    emitUpdate();
    await flush();

    expect(casesClient.cases.push).not.toHaveBeenCalled();
  });

  it('does not push below an Enterprise license', async () => {
    isAtLeastEnterprise.mockResolvedValue(false);

    emitUpdate();
    await flush();

    expect(getCasesClient).not.toHaveBeenCalled();
  });

  it('folds changes that arrive during a push into one follow-up push', async () => {
    let resolveFirstPush: (value: Case) => void = () => {};
    casesClient.cases.push.mockImplementationOnce(
      () => new Promise<Case>((resolve) => (resolveFirstPush = resolve))
    );

    emitUpdate();
    await flush();
    emitUpdate();
    emitUpdate();
    await flush();
    expect(casesClient.cases.push).toHaveBeenCalledTimes(1);

    resolveFirstPush(theCase);
    await flush();

    expect(casesClient.cases.push).toHaveBeenCalledTimes(2);
  });

  // The push failed (connector down, missing privilege); the case update itself already succeeded.
  it('logs and swallows a failed push', async () => {
    casesClient.cases.push.mockRejectedValue(new Error('connector unreachable'));

    emitUpdate();
    await flush();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Automatic push of case mock-id-1 failed: Error: connector unreachable'
      )
    );
    // A later change is pushed again; the failure did not wedge the case.
    casesClient.cases.push.mockResolvedValue(theCase);
    emitUpdate();
    await flush();
    expect(casesClient.cases.push).toHaveBeenCalledTimes(2);
  });
});
