/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createCasesClientInternalMock,
  createCasesClientMock,
  createCasesClientMockArgs,
} from '../../mocks';
import { createAttachmentsSubClient } from '../../attachments/client';
import { bulkCreate as bulkCreateAttachments } from '../../attachments/bulk_create';
import { bulkUpdate } from '../bulk_update';
import { createCasesSubClient } from '../client';

jest.mock('../../attachments/bulk_create');
jest.mock('../bulk_update');

/**
 * The merge's internal options (skipping required-on-close, alert sync, observable extraction and
 * per-item activity) must not be reachable through the client every route and step uses.
 */
describe('internal merge options', () => {
  const clientArgs = createCasesClientMockArgs();
  const casesClient = createCasesClientMock();
  const casesClientInternal = createCasesClientInternalMock();
  const internalOptions = {
    skipAlertSync: true,
    skipRequiredOnClose: true,
    markClosedByMerge: true,
    skipUserActions: true,
    skipAlertStatusSync: true,
    skipObservableExtraction: true,
  };

  it('are dropped by the cases client', async () => {
    const subClient = createCasesSubClient(clientArgs, casesClient, casesClientInternal);
    const callWithOptions = subClient.bulkUpdate as unknown as (
      cases: unknown,
      options: unknown
    ) => Promise<unknown>;

    await callWithOptions({ cases: [] }, internalOptions);

    expect(jest.mocked(bulkUpdate)).toHaveBeenCalledWith({ cases: [] }, clientArgs, casesClient);
  });

  it('are dropped by the attachments client', async () => {
    const subClient = createAttachmentsSubClient(clientArgs, casesClient, casesClientInternal);
    const callWithOptions = subClient.bulkCreate as unknown as (
      args: unknown,
      options: unknown
    ) => Promise<unknown>;

    await callWithOptions({ caseId: 'case-1', attachments: [] }, internalOptions);

    expect(jest.mocked(bulkCreateAttachments)).toHaveBeenCalledWith(
      { caseId: 'case-1', attachments: [] },
      clientArgs
    );
  });
});
