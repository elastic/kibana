/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import * as api from '../api/api';
import { TestProviders } from '../../../common/mock';
import { useGetTemplateCreators } from './use_get_template_creators';
import { useToasts } from '../../../common/lib/kibana';

vi.mock('../api/api');
vi.mock('../../../common/lib/kibana');

describe('useGetTemplateCreators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToasts as Mock).mockReturnValue({ addError: vi.fn() });
  });

  it('calls getTemplateCreators api', async () => {
    const spyOnGetTemplateCreators = vi.spyOn(api, 'getTemplateCreators');
    spyOnGetTemplateCreators.mockResolvedValue(['user1', 'user2']);

    renderHook(() => useGetTemplateCreators(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders>{children}</TestProviders>
      ),
    });

    await waitFor(() => expect(spyOnGetTemplateCreators).toHaveBeenCalled());
  });

  it('returns creators data', async () => {
    const mockCreators = ['john.doe', 'jane.smith'];
    vi.spyOn(api, 'getTemplateCreators').mockResolvedValue(mockCreators);

    const { result } = renderHook(() => useGetTemplateCreators(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders>{children}</TestProviders>
      ),
    });

    await waitFor(() => expect(result.current.data).toEqual(mockCreators));
  });

  it('displays an error toast when an error occurs', async () => {
    const addError = vi.fn();
    (useToasts as Mock).mockReturnValue({ addError });

    const spyOnGetTemplateCreators = vi.spyOn(api, 'getTemplateCreators');
    spyOnGetTemplateCreators.mockRejectedValue(new Error('Something went wrong'));

    renderHook(() => useGetTemplateCreators(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders>{children}</TestProviders>
      ),
    });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });

  it('does not display error toast for AbortError', async () => {
    const addError = vi.fn();
    (useToasts as Mock).mockReturnValue({ addError });

    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';

    const spyOnGetTemplateCreators = vi.spyOn(api, 'getTemplateCreators');
    spyOnGetTemplateCreators.mockRejectedValue(abortError);

    renderHook(() => useGetTemplateCreators(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders>{children}</TestProviders>
      ),
    });

    await waitFor(() => expect(spyOnGetTemplateCreators).toHaveBeenCalled());
    expect(addError).not.toHaveBeenCalled();
  });
});
