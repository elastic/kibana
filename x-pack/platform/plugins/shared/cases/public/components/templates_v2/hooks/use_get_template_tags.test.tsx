/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import * as api from '../api/api';
import { TestProviders } from '../../../common/mock';
import { useGetTemplateTags } from './use_get_template_tags';
import { useToasts } from '../../../common/lib/kibana';

jest.mock('../api/api');
jest.mock('../../../common/lib/kibana');

describe('useGetTemplateTags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useToasts as jest.Mock).mockReturnValue({ addError: jest.fn() });
  });

  it('calls getTemplateTags api', async () => {
    const spyOnGetTemplateTags = jest.spyOn(api, 'getTemplateTags');
    spyOnGetTemplateTags.mockResolvedValue(['tag1', 'tag2']);

    renderHook(() => useGetTemplateTags(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders>{children}</TestProviders>
      ),
    });

    await waitFor(() => expect(spyOnGetTemplateTags).toBeCalled());
  });

  it('returns tags data', async () => {
    const mockTags = ['security', 'incident', 'critical'];
    jest.spyOn(api, 'getTemplateTags').mockResolvedValue(mockTags);

    const { result } = renderHook(() => useGetTemplateTags(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders>{children}</TestProviders>
      ),
    });

    await waitFor(() => expect(result.current.data).toEqual(mockTags));
  });

  it('displays an error toast when an error occurs', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const spyOnGetTemplateTags = jest.spyOn(api, 'getTemplateTags');
    spyOnGetTemplateTags.mockRejectedValue(new Error('Something went wrong'));

    renderHook(() => useGetTemplateTags(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders>{children}</TestProviders>
      ),
    });

    await waitFor(() => expect(addError).toBeCalled());
  });

  it('does not display error toast for AbortError', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';

    const spyOnGetTemplateTags = jest.spyOn(api, 'getTemplateTags');
    spyOnGetTemplateTags.mockRejectedValue(abortError);

    renderHook(() => useGetTemplateTags(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders>{children}</TestProviders>
      ),
    });

    await waitFor(() => expect(spyOnGetTemplateTags).toBeCalled());
    expect(addError).not.toBeCalled();
  });
});
