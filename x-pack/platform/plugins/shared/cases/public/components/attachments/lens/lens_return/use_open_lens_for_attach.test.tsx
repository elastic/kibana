/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { of } from 'rxjs';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsMainApplication } from '../../../../common/hooks';
import { useOpenLensForAttach } from './use_open_lens_for_attach';
import { PENDING_LENS_ATTACH_STORAGE_ID } from './constants';
import type { FoundSavedObject } from '../../common/saved_object/types';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks');
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/cases/case-1', search: '?tab=activity' }),
}));

const useKibanaMock = useKibana as jest.Mock;
const useIsMainApplicationMock = useIsMainApplication as jest.Mock;

const buildSO = (overrides: Partial<FoundSavedObject> = {}): FoundSavedObject => ({
  id: 'lens-1',
  type: 'lens',
  meta: { title: 'Top hosts' },
  ...overrides,
});

describe('useOpenLensForAttach', () => {
  const navigateToEditor = jest.fn().mockResolvedValue(undefined);
  const storageSet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useIsMainApplicationMock.mockReturnValue(true);
    useKibanaMock.mockReturnValue({
      services: {
        application: { currentAppId$: of('securitySolutionUI') },
        embeddable: { getStateTransfer: () => ({ navigateToEditor }) },
        storage: { set: storageSet, get: jest.fn(), remove: jest.fn() },
      },
    });
  });

  const renderOpen = () =>
    renderHook(() => useOpenLensForAttach({ caseId: 'case-1', caseOwner: 'cases' }));

  it('writes a pending record and navigates to the Lens editor for the SO id', async () => {
    const { result } = renderOpen();
    await act(async () => {
      await result.current(buildSO());
    });
    expect(storageSet).toHaveBeenCalledWith(
      PENDING_LENS_ATTACH_STORAGE_ID,
      expect.objectContaining({
        caseId: 'case-1',
        caseOwner: 'cases',
        savedObjectId: 'lens-1',
        title: 'Top hosts',
      })
    );
    expect(navigateToEditor).toHaveBeenCalledWith(
      'lens',
      expect.objectContaining({
        path: '#/edit/lens-1',
        state: expect.objectContaining({ originatingApp: 'securitySolutionUI' }),
      })
    );
  });

  it('prefixes the originating path with the stack cases mount when in the main app', async () => {
    useIsMainApplicationMock.mockReturnValue(true);
    const { result } = renderOpen();
    await act(async () => {
      await result.current(buildSO());
    });
    const { state } = navigateToEditor.mock.calls.at(-1)![1];
    expect(state.originatingPath).toBe('/insightsAndAlerting/cases/cases/case-1?tab=activity');
  });

  it('uses the raw location path when embedded in a solution app', async () => {
    useIsMainApplicationMock.mockReturnValue(false);
    const { result } = renderOpen();
    await act(async () => {
      await result.current(buildSO());
    });
    const { state } = navigateToEditor.mock.calls.at(-1)![1];
    expect(state.originatingPath).toBe('/cases/case-1?tab=activity');
  });

  it('falls back to the saved object id when the SO has no title', async () => {
    const { result } = renderOpen();
    await act(async () => {
      await result.current(buildSO({ meta: {} }));
    });
    expect(storageSet.mock.calls.at(-1)?.[1]).toMatchObject({ title: 'lens-1' });
  });
});
