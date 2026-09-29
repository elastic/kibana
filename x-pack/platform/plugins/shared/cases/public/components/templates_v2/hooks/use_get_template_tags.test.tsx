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
import { useGetTemplateTags } from './use_get_template_tags';
import { useToasts } from '../../../common/lib/kibana';

vi.mock('../api/api');
vi.mock('../../../common/lib/kibana');

describe('useGetTemplateTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToasts as Mock).mockReturnValue({ addError: vi.fn() });
  });

  it('calls getTemplateTags api', async () => {
    const spyOnGetTemplateTags = vi.spyOn(api, 'getTemplateTags');
    spyOnGetTemplateTags.mockResolvedValue(['tag1', 'tag2']);

    renderHook(() => useGetTemplateTags(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders>{children}</TestProviders>
      ),
    });

    await waitFor(() => expect(spyOnGetTemplateTags).toHaveBeenCalled());
  });

  it('returns tags data', async () => {
    const mockTags = ['security', 'incident', 'critical'];
    vi.spyOn(api, 'getTemplateTags').mockResolvedValue(mockTags);

    const { result } = renderHook(() => useGetTemplateTags(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders>{children}</TestProviders>
      ),
    });

    await waitFor(() => expect(result.current.data).toEqual(mockTags));
  });

  it('displays an error toast when an error occurs', async () => {
    const addError = vi.fn();
    (useToasts as Mock).mockReturnValue({ addError });

    const spyOnGetTemplateTags = vi.spyOn(api, 'getTemplateTags');
    spyOnGetTemplateTags.mockRejectedValue(new Error('Something went wrong'));

    renderHook(() => useGetTemplateTags(), {
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

    const spyOnGetTemplateTags = vi.spyOn(api, 'getTemplateTags');
    spyOnGetTemplateTags.mockRejectedValue(abortError);

    renderHook(() => useGetTemplateTags(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders>{children}</TestProviders>
      ),
    });

    await waitFor(() => expect(spyOnGetTemplateTags).toHaveBeenCalled());
    expect(addError).not.toHaveBeenCalled();
  });
});
