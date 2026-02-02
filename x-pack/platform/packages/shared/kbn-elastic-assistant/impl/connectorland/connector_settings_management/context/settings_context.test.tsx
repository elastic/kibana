/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { SettingsContextProvider, useSettingsContext } from './settings_context';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { PublicUiSettingsParams, UserProvidedValues } from '@kbn/core/public';
import { Subject } from 'rxjs';
import { SettingsStart } from '@kbn/core-ui-settings-browser';

describe('settings_context', () => {
  const setupSettingsContext = () => {
    const queryClient = new QueryClient();
    const set = jest.fn().mockResolvedValue(undefined);

    const rendered = renderHook(() => useSettingsContext(), {
      wrapper: ({ children }) => {
        return (
          <QueryClientProvider client={queryClient}>
            <SettingsContextProvider
              settings={
                {
                  client: {
                    getUpdateErrors$: () => new Subject(),
                    isOverridden: () => false,
                    isCustom: () => false,
                    set,
                    getAll: jest.fn().mockReturnValue({
                      'genAiSettings:defaultAIConnector': {
                        readonlyMode: 'ui',
                        value: 'NO_DEFAULT_CONNECTOR',
                        userValue: 'pmeClaudeV37SonnetUsEast1',
                      },
                      'genAiSettings:defaultAIConnectorOnly': {
                        readonlyMode: 'ui',
                        value: false,
                        userValue: true,
                      },
                    } as Record<string, PublicUiSettingsParams & UserProvidedValues>),
                  },
                } as unknown as SettingsStart
              }
            >
              {children}
            </SettingsContextProvider>
          </QueryClientProvider>
        );
      },
    });

    return { result: rendered.result, set };
  };

  it('should provide the correct initial state', async () => {
    const { result } = setupSettingsContext();

    await waitFor(() => {
      expect(result.current.fields).toEqual(
        expect.objectContaining({
          'genAiSettings:defaultAIConnector': expect.anything(),
          'genAiSettings:defaultAIConnectorOnly': expect.anything(),
        })
      );
    });

    expect(result.current.unsavedChanges).toEqual({});
    expect(result.current.handleFieldChange).toBeInstanceOf(Function);
    expect(result.current.saveAll).toBeInstanceOf(Function);
    expect(result.current.cleanUnsavedChanges).toBeInstanceOf(Function);
    expect(result.current.saveSingleSetting).toBeInstanceOf(Function);
  });

  it('should handle updating unsaved changes', async () => {
    const { result } = setupSettingsContext();

    await waitFor(() => {
      expect(result.current.fields).toBeDefined();
    });

    expect(result.current.unsavedChanges).toEqual({});

    act(() => {
      result.current.handleFieldChange('test', {
        type: 'string',
        unsavedValue: 'testValue',
      });
    });

    expect(result.current.unsavedChanges).toEqual({
      test: {
        type: 'string',
        unsavedValue: 'testValue',
      },
    });
  });

  it('should save unsaved changes', async () => {
    const { result, set } = setupSettingsContext();

    await waitFor(() => {
      expect(result.current.fields).toBeDefined();
    });

    act(() => {
      result.current.handleFieldChange('test', {
        type: 'string',
        unsavedValue: 'testValue',
      });
    });

    expect(set).toHaveBeenCalledTimes(0);

    await act(async () => {
      await result.current.saveAll();
    });

    expect(set).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.unsavedChanges).toEqual({});
    });
  });

  it('should save single setting', async () => {
    const { result, set } = setupSettingsContext();

    await waitFor(() => {
      expect(result.current.fields).toBeDefined();
    });

    expect(set).toHaveBeenCalledTimes(0);

    await act(async () => {
      await result.current.saveSingleSetting({
        id: 'foo',
        change: 'bar',
      });
    });

    expect(set).toHaveBeenCalledTimes(1);
  });

  it('should revert unsaved changes', async () => {
    const { result } = setupSettingsContext();

    await waitFor(() => {
      expect(result.current.fields).toBeDefined();
    });

    act(() => {
      result.current.handleFieldChange('test', {
        type: 'string',
        unsavedValue: 'testValue',
      });
    });

    expect(result.current.unsavedChanges).toEqual({
      test: {
        type: 'string',
        unsavedValue: 'testValue',
      },
    });

    act(() => {
      result.current.cleanUnsavedChanges();
    });

    expect(result.current.unsavedChanges).toEqual({});
  });
});
