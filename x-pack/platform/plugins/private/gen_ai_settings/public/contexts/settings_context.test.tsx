/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import {
  SettingsContextProvider,
  useSettingsContext,
  useFieldSettingsContext,
} from './settings_context';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { PublicUiSettingsParams, UserProvidedValues } from '@kbn/core/public';
import { Subject } from 'rxjs';

describe('settings_context', () => {
  const setupSettingsContext = () => {
    const queryClient = new QueryClient({
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    });
    const updateSubject = new Subject<{ key: string }>();
    const set = jest.fn().mockResolvedValue(undefined);

    const rendered = renderHook(() => useSettingsContext(), {
      wrapper: ({ children }) => (
        <KibanaContextProvider
          services={{
            notifications: {
              toasts: {
                addDanger: jest.fn(),
                addSuccess: jest.fn(),
              },
            },
            settings: {
              client: {
                getUpdate$: () => updateSubject,
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
                } as Record<string, PublicUiSettingsParams & UserProvidedValues<any>>),
              },
            },
          }}
        >
          <QueryClientProvider client={queryClient}>
            <SettingsContextProvider>{children}</SettingsContextProvider>
          </QueryClientProvider>
        </KibanaContextProvider>
      ),
    });

    return { result: rendered.result, set, queryClient, updateSubject };
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
    expect(result.current.setValidationErrors).toBeInstanceOf(Function);
  });

  it('should subscribe to settings updates and invalidate queries for tracked settings', async () => {
    const { result, queryClient, updateSubject } = setupSettingsContext();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await waitFor(() => {
      expect(result.current.fields).toBeDefined();
    });

    invalidateQueriesSpy.mockClear();

    act(() => {
      updateSubject.next({ key: 'genAiSettings:defaultAIConnector' });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [
        'settingsFields',
        expect.arrayContaining([
          'genAiSettings:defaultAIConnector',
          'genAiSettings:defaultAIConnectorOnly',
        ]),
      ],
    });

    invalidateQueriesSpy.mockClear();

    act(() => {
      updateSubject.next({ key: 'some:otherSetting' });
    });

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();

    invalidateQueriesSpy.mockRestore();
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

  describe('validation functionality', () => {
    it('should set and clear validation errors', async () => {
      const { result } = setupSettingsContext();

      await waitFor(() => {
        expect(result.current.fields).toBeDefined();
      });

      const validationErrors = [
        { message: 'Test error 1', field: 'field1' },
        { message: 'Test error 2', field: 'field2' },
      ];

      act(() => {
        result.current.setValidationErrors(validationErrors);
      });

      // The validation errors are stored internally and used during save
      expect(result.current.setValidationErrors).toBeInstanceOf(Function);

      // Clear validation errors
      act(() => {
        result.current.setValidationErrors([]);
      });

      expect(result.current.setValidationErrors).toBeInstanceOf(Function);
    });

    it('should prevent save when validation errors exist', async () => {
      const { result, set } = setupSettingsContext();

      await waitFor(() => {
        expect(result.current.fields).toBeDefined();
      });

      // Add unsaved changes
      act(() => {
        result.current.handleFieldChange('test', {
          type: 'string',
          unsavedValue: 'testValue',
        });
      });

      // Set validation errors
      const validationErrors = [{ message: 'Validation failed', field: 'test' }];

      act(() => {
        result.current.setValidationErrors(validationErrors);
      });

      // Try to save - should fail due to validation errors
      await act(async () => {
        try {
          await result.current.saveAll();
        } catch (error) {
          expect(error).toEqual(new Error('Validation failed'));
        }
      });

      // Verify that set was never called due to validation failure
      expect(set).toHaveBeenCalledTimes(0);
    });

    it('should proceed with save when no validation errors exist', async () => {
      const { result, set } = setupSettingsContext();

      await waitFor(() => {
        expect(result.current.fields).toBeDefined();
      });

      // Add unsaved changes
      act(() => {
        result.current.handleFieldChange('test', {
          type: 'string',
          unsavedValue: 'testValue',
        });
      });

      // No validation errors set - should proceed with save
      await act(async () => {
        await result.current.saveAll();
      });

      expect(set).toHaveBeenCalledTimes(1);
      expect(set).toHaveBeenCalledWith('test', 'testValue');
    });

    it('should show success toast when settings are saved successfully', async () => {
      const addSuccess = jest.fn();
      const set = jest.fn().mockResolvedValue(undefined);

      // We need to setup the context with a way to access the addSuccess mock
      const setupWithSuccessMock = () => {
        const queryClient = new QueryClient();

        const rendered = renderHook(() => useSettingsContext(), {
          wrapper: ({ children }) => (
            <KibanaContextProvider
              services={{
                notifications: {
                  toasts: {
                    addDanger: jest.fn(),
                    addSuccess,
                  },
                },
                settings: {
                  client: {
                    getUpdate$: () => new Subject(),
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
                    }),
                  },
                },
              }}
            >
              <QueryClientProvider client={queryClient}>
                <SettingsContextProvider>{children}</SettingsContextProvider>
              </QueryClientProvider>
            </KibanaContextProvider>
          ),
        });

        return { result: rendered.result };
      };

      const { result: successResult } = setupWithSuccessMock();

      await waitFor(() => {
        expect(successResult.current.fields).toBeDefined();
      });

      // Add unsaved changes
      act(() => {
        successResult.current.handleFieldChange('test', {
          type: 'string',
          unsavedValue: 'testValue',
        });
      });

      // Save all settings
      await act(async () => {
        await successResult.current.saveAll();
      });

      // Verify that the success toast was called
      expect(addSuccess).toHaveBeenCalledTimes(1);
      expect(addSuccess).toHaveBeenCalledWith({
        title: 'Settings saved',
      });
    });
  });

  describe('useFieldSettingsContext', () => {
    it('should throw error when no field names provided', () => {
      expect(() => {
        const { result } = renderHook(() => useFieldSettingsContext([]), {
          wrapper: ({ children }) => (
            <KibanaContextProvider
              services={{
                notifications: {
                  toasts: {
                    addDanger: jest.fn(),
                  },
                },
                settings: {
                  client: {
                    getUpdateErrors$: () => new Subject(),
                    isOverridden: () => false,
                    isCustom: () => false,
                    set: jest.fn(),
                    getAll: jest.fn().mockReturnValue({}),
                  },
                },
              }}
            >
              <QueryClientProvider client={new QueryClient()}>
                <SettingsContextProvider>{children}</SettingsContextProvider>
              </QueryClientProvider>
            </KibanaContextProvider>
          ),
        });
        // This should trigger the error
        return result.current;
      }).toThrow('useFieldSettingsContext requires at least one field name');
    });

    it('should throw error when trying to set validation errors for unmanaged fields', async () => {
      const { result } = renderHook(() => useFieldSettingsContext(['allowedField']), {
        wrapper: ({ children }) => (
          <KibanaContextProvider
            services={{
              notifications: {
                toasts: {
                  addDanger: jest.fn(),
                },
              },
              settings: {
                client: {
                  getUpdate$: () => new Subject(),
                  getUpdateErrors$: () => new Subject(),
                  isOverridden: () => false,
                  isCustom: () => false,
                  set: jest.fn(),
                  getAll: jest.fn().mockReturnValue({}),
                },
              },
            }}
          >
            <QueryClientProvider client={new QueryClient()}>
              <SettingsContextProvider>{children}</SettingsContextProvider>
            </QueryClientProvider>
          </KibanaContextProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.setValidationErrors).toBeInstanceOf(Function);
      });

      expect(() => {
        result.current.setValidationErrors([{ message: 'Test error', field: 'unauthorizedField' }]);
      }).toThrow('Validation errors contain fields not managed by this hook instance');
    });

    it('should allow setting validation errors for managed fields only', async () => {
      const { result } = renderHook(() => useFieldSettingsContext(['allowedField']), {
        wrapper: ({ children }) => (
          <KibanaContextProvider
            services={{
              notifications: {
                toasts: {
                  addDanger: jest.fn(),
                },
              },
              settings: {
                client: {
                  getUpdate$: () => new Subject(),
                  getUpdateErrors$: () => new Subject(),
                  isOverridden: () => false,
                  isCustom: () => false,
                  set: jest.fn(),
                  getAll: jest.fn().mockReturnValue({}),
                },
              },
            }}
          >
            <QueryClientProvider client={new QueryClient()}>
              <SettingsContextProvider>{children}</SettingsContextProvider>
            </QueryClientProvider>
          </KibanaContextProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.setValidationErrors).toBeInstanceOf(Function);
      });

      // This should not throw
      act(() => {
        result.current.setValidationErrors([{ message: 'Test error', field: 'allowedField' }]);
      });

      expect(result.current.setValidationErrors).toBeInstanceOf(Function);
    });
  });
});
