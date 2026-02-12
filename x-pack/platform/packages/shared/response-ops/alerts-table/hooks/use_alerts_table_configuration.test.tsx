/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useAlertsTableConfiguration } from './use_alerts_table_configuration';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

const mockStorageData = new Map<string, string>();
const mockStorageWrapper = {
  get: jest.fn((key: string) => mockStorageData.get(key)),
  set: jest.fn((key: string, value: string) => mockStorageData.set(key, value)),
  remove: jest.fn((key: string) => mockStorageData.delete(key)),
  clear: jest.fn(() => mockStorageData.clear()),
};
const notifications = notificationServiceMock.createStartContract();

describe('useAlertsTableConfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageData.clear();
  });

  it('should return null if no configurationStorage is provided', () => {
    const { result } = renderHook(() =>
      useAlertsTableConfiguration({
        id: 'test-id',
        configurationStorage: null,
        notifications,
      })
    );

    expect(result.current[0]).toBeNull();
  });

  it('should return null if no saved configuration exists on first render', () => {
    const { result } = renderHook(() =>
      useAlertsTableConfiguration({
        id: 'test-id',
        configurationStorage: mockStorageWrapper,
        notifications,
      })
    );

    expect(result.current[0]).toBeNull();
  });

  it('should return any pre-existing saved configuration on first render', () => {
    const mockConfig = {
      columns: [{ id: 'column1', initialWidth: 100 }],
      visibleColumns: ['column1'],
      sort: [],
    };
    mockStorageData.set('test-id', JSON.stringify(mockConfig));
    const { result } = renderHook(() =>
      useAlertsTableConfiguration({
        id: 'test-id',
        configurationStorage: mockStorageWrapper,
        notifications,
      })
    );

    expect(result.current[0]).toEqual(mockConfig);
  });

  it('should reset invalid saved configuration and notify the user', () => {
    const invalidConfig = '{ invalidJson: true ';
    mockStorageData.set('test-id', invalidConfig);
    const { result } = renderHook(() =>
      useAlertsTableConfiguration({
        id: 'test-id',
        configurationStorage: mockStorageWrapper,
        notifications,
      })
    );

    expect(result.current[0]).toBeNull();
    expect(mockStorageWrapper.remove).toHaveBeenCalledWith('test-id');
    expect(notifications.toasts.addWarning).toHaveBeenCalled();
  });

  it('should save new configuration when setConfiguration is called', () => {
    const { result } = renderHook(() =>
      useAlertsTableConfiguration({
        id: 'test-id',
        configurationStorage: mockStorageWrapper,
        notifications,
      })
    );

    const newConfig = {
      columns: [{ id: 'column1', initialWidth: 100 }],
      visibleColumns: ['column1'],
      sort: [],
    };
    act(() => {
      result.current[1](newConfig);
    });

    expect(result.current[0]).toEqual(newConfig);
    expect(mockStorageWrapper.set).toHaveBeenCalledWith('test-id', JSON.stringify(newConfig));
  });

  it('should remove unknown properties from the configuration when saving', () => {
    const { result } = renderHook(() =>
      useAlertsTableConfiguration({
        id: 'test-id',
        configurationStorage: mockStorageWrapper,
        notifications,
      })
    );

    const newConfig = {
      columns: [{ id: 'column1', initialWidth: 100, unknownColumnProp: 'shouldBeRemoved' }],
      visibleColumns: ['column1'],
      sort: [{ column1: { order: 'asc', unserializableProp: new Map() } }],
      unknownProp: 'shouldBeRemoved',
    } as any;
    const expectedConfig = {
      columns: [{ id: 'column1', initialWidth: 100 }],
      visibleColumns: ['column1'],
      sort: [{ column1: { order: 'asc' } }],
    };
    act(() => {
      result.current[1](newConfig);
    });

    expect(result.current[0]).toEqual(expectedConfig);
    expect(mockStorageWrapper.set).toHaveBeenCalledWith('test-id', JSON.stringify(expectedConfig));
  });

  it('should not save configuration if it is structurally equivalent to the previous', () => {
    const initialConfig = {
      columns: [{ id: 'column1', initialWidth: 100 }],
      visibleColumns: ['column1'],
      sort: [],
    };
    mockStorageData.set('test-id', JSON.stringify(initialConfig));
    const { result } = renderHook(() =>
      useAlertsTableConfiguration({
        id: 'test-id',
        configurationStorage: mockStorageWrapper,
        notifications,
      })
    );

    expect(result.current[0]).toEqual(initialConfig);
    act(() => {
      result.current[1]({ ...initialConfig });
    });
    expect(mockStorageWrapper.set).not.toHaveBeenCalled();
  });

  it('should remove saved configuration when setConfiguration is called with null', () => {
    const initialConfig = {
      columns: [{ id: 'column1', initialWidth: 100 }],
      visibleColumns: ['column1'],
      sort: [],
    };
    mockStorageData.set('test-id', JSON.stringify(initialConfig));
    const { result } = renderHook(() =>
      useAlertsTableConfiguration({
        id: 'test-id',
        configurationStorage: mockStorageWrapper,
        notifications,
      })
    );

    expect(result.current[0]).toEqual(initialConfig);
    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
    expect(mockStorageWrapper.remove).toHaveBeenCalledWith('test-id');
  });
});
