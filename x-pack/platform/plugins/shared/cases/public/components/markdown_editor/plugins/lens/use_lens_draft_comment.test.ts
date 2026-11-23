/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';

import { useKibana } from '../../../../common/lib/kibana';
import { getPendingLensAttach } from '../../../attachments/lens/lens_return/storage';
import { DRAFT_COMMENT_STORAGE_ID } from './constants';
import { useLensDraftComment } from './use_lens_draft_comment';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../attachments/lens/lens_return/storage');

describe('useLensDraftComment', () => {
  const getIncomingEmbeddablePackage = jest.fn();
  const storageGet = jest.fn();
  const storageRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getPendingLensAttach as jest.Mock).mockReturnValue(false);
    storageGet.mockReturnValue(undefined);
    getIncomingEmbeddablePackage.mockReturnValue(undefined);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: { currentAppId$: of('cases') },
        embeddable: {
          getStateTransfer: () => ({ getIncomingEmbeddablePackage }),
        },
        storage: { get: storageGet, remove: storageRemove },
      },
    });
  });

  it('does not treat a non-lens incoming package array as lens state', async () => {
    getIncomingEmbeddablePackage.mockReturnValue([{ type: 'dashboard' }]);

    const { result } = renderHook(() => useLensDraftComment());

    await waitFor(() => {
      expect(result.current.hasIncomingLensState).toBe(false);
    });
  });

  it('does not treat an empty incoming package array as lens state', async () => {
    getIncomingEmbeddablePackage.mockReturnValue([]);

    const { result } = renderHook(() => useLensDraftComment());

    await waitFor(() => {
      expect(result.current.hasIncomingLensState).toBe(false);
    });
  });

  it('sets hasIncomingLensState when a lens embeddable package is present', async () => {
    getIncomingEmbeddablePackage.mockReturnValue([{ type: LENS_EMBEDDABLE_TYPE }]);

    const { result } = renderHook(() => useLensDraftComment());

    await waitFor(() => {
      expect(result.current.hasIncomingLensState).toBe(true);
    });
  });

  it('hydrates a draft comment from storage', async () => {
    const draftComment = { commentId: 'c1', comment: 'draft' };
    storageGet.mockReturnValue(draftComment);

    const { result } = renderHook(() => useLensDraftComment());

    await waitFor(() => {
      expect(result.current.draftComment).toEqual(draftComment);
    });
    expect(storageGet).toHaveBeenCalledWith(DRAFT_COMMENT_STORAGE_ID);
  });
});
