/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import { TestProviders } from '../../../../common/mock';
import { useKibana, useToasts } from '../../../../common/lib/kibana';
import { useCreateAttachments } from '../../../../containers/use_create_attachments';
import { useRefreshCaseViewPage as getRefreshCaseViewPageMock } from '../../../case_view/use_on_refresh_case_view_page';
import { useConsumeLensReturn } from './use_consume_lens_return';
import { PENDING_LENS_ATTACH_STORAGE_ID } from './constants';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../containers/use_create_attachments');
jest.mock('../../../case_view/use_on_refresh_case_view_page');

const useKibanaMock = useKibana as jest.Mock;
const useToastsMock = useToasts as jest.Mock;
const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;
const refreshCaseViewPage = getRefreshCaseViewPageMock() as jest.Mock;

const pending = {
  caseId: 'case-1',
  caseOwner: 'cases',
  savedObjectId: 'lens-1',
  title: 'Top hosts',
};

describe('useConsumeLensReturn', () => {
  const mutateAsync = jest.fn().mockResolvedValue(undefined);
  const addSuccess = jest.fn();
  const getIncomingEmbeddablePackage = jest.fn();
  const cmGet = jest.fn();
  const getTime = jest.fn();
  const storageGet = jest.fn();
  const storageRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useCreateAttachmentsMock.mockReturnValue({ mutateAsync, isLoading: false });
    useToastsMock.mockReturnValue({ addSuccess, addError: jest.fn() });
    getTime.mockReturnValue({ from: 'now-24h', to: 'now', mode: 'relative' });
    cmGet.mockResolvedValue({
      item: { attributes: { state: { query: {} } }, references: [] },
    });
    useKibanaMock.mockReturnValue({
      services: {
        application: { currentAppId$: of('securitySolutionUI') },
        contentManagement: { client: { get: cmGet } },
        data: { query: { timefilter: { timefilter: { getTime } } } },
        embeddable: { getStateTransfer: () => ({ getIncomingEmbeddablePackage }) },
        storage: { get: storageGet, set: jest.fn(), remove: storageRemove },
      },
    });
  });

  const renderConsume = (caseId = 'case-1') =>
    renderHook(() => useConsumeLensReturn({ caseId }), { wrapper: TestProviders });

  it('no-ops when there is no pending record', async () => {
    storageGet.mockReturnValue(undefined);
    getIncomingEmbeddablePackage.mockReturnValue([{ type: 'lens' }]);
    renderConsume();
    await waitFor(() => expect(storageGet).toHaveBeenCalled());
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('no-ops when the pending record is for a different case', async () => {
    storageGet.mockReturnValue({ ...pending, caseId: 'case-2' });
    getIncomingEmbeddablePackage.mockReturnValue([{ type: 'lens' }]);
    renderConsume('case-1');
    await new Promise((r) => setTimeout(r, 0));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('clears the marker without attaching when no lens package returns', async () => {
    storageGet.mockReturnValue(pending);
    getIncomingEmbeddablePackage.mockReturnValue([{ type: 'dashboard' }]);
    renderConsume();
    await waitFor(() => expect(storageRemove).toHaveBeenCalledWith(PENDING_LENS_ATTACH_STORAGE_ID));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('creates a lens attachment, drains the package, clears storage, refreshes, and toasts', async () => {
    storageGet.mockReturnValue(pending);
    // Lens transfers the package keyed by the embeddable type ("vis").
    getIncomingEmbeddablePackage.mockReturnValue([{ type: 'vis' }]);
    renderConsume();

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());

    const sent = mutateAsync.mock.calls[0][0];
    expect(sent.caseId).toBe('case-1');
    expect(sent.attachments[0]).toMatchObject({
      type: 'lens',
      attachmentId: 'lens-1',
      metadata: { title: 'Top hosts', soType: 'lens' },
    });
    // The global time range is snapshotted as absolute so the attachment
    // doesn't drift with relative values like `now-24h`.
    const { timeRange } = sent.attachments[0].data;
    expect(timeRange.from).not.toContain('now');
    expect(timeRange.to).not.toContain('now');
    // Peeked (false) before draining (true).
    expect(getIncomingEmbeddablePackage).toHaveBeenCalledWith('securitySolutionUI', false);
    expect(getIncomingEmbeddablePackage).toHaveBeenCalledWith('securitySolutionUI', true);
    expect(storageRemove).toHaveBeenCalledWith(PENDING_LENS_ATTACH_STORAGE_ID);
    expect(addSuccess).toHaveBeenCalled();
    expect(refreshCaseViewPage).toHaveBeenCalled();
  });
});
