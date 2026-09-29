/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';
import { useInstallProductDoc } from './use_install_product_doc';
import { useAssistantContext } from '../../../..';
import { TestProviders } from '../../../mock/test_providers/test_providers';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

vi.mock('../../../..', () => {
      const mocked = {
      useAssistantContext: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('useInstallProductDoc', () => {
  const mockInstall = vi.fn();
  const mockAddSuccess = vi.fn();
  const mockAddError = vi.fn();

  beforeEach(() => {
    (useAssistantContext as Mock).mockReturnValue({
      productDocBase: {
        installation: {
          install: mockInstall,
        },
      },
      toasts: {
        addSuccess: mockAddSuccess,
        addError: mockAddError,
      },
    });
  });

  it('returns success state and shows success toast on successful installation', async () => {
    mockInstall.mockResolvedValueOnce({});
    const { result } = renderHook(() => useInstallProductDoc(), {
      wrapper: TestProviders,
    });

    result.current.mutate(defaultInferenceEndpoints.ELSER);
    await waitFor(() => result.current.isSuccess);

    expect(mockAddSuccess).toHaveBeenCalledWith(
      'The Elastic documentation was successfully installed'
    );
  });

  it('returns error state and shows error toast on failed installation', async () => {
    const error = new Error('error message');
    mockInstall.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useInstallProductDoc(), {
      wrapper: TestProviders,
    });

    result.current.mutate(defaultInferenceEndpoints.ELSER);
    await waitFor(() => result.current.isError);

    expect(mockAddError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'error message',
      }),
      { title: 'Something went wrong while installing the Elastic documentation' }
    );
  });
});
