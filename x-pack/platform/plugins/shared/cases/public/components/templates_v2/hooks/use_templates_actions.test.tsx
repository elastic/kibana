/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';

import { TestProviders } from '../../../common/mock';
import { useTemplatesActions } from './use_templates_actions';
import type { Template } from '../types';

describe('useTemplatesActions', () => {
  const wrapper = ({ children }: React.PropsWithChildren<{}>) => (
    <TestProviders>{children}</TestProviders>
  );

  const mockTemplate: Template = {
    key: 'template-1',
    name: 'Template 1',
    description: 'Description',
    solution: 'security',
    fields: 5,
    tags: ['tag1'],
    lastUpdate: '2024-01-01T00:00:00.000Z',
    lastTimeUsed: '2024-01-01T00:00:00.000Z',
    usage: 10,
    isDefault: false,
  };

  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('returns all action handlers', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    expect(result.current).toHaveProperty('handleEdit');
    expect(result.current).toHaveProperty('handleClone');
    expect(result.current).toHaveProperty('handleSetAsDefault');
    expect(result.current).toHaveProperty('handleExport');
    expect(result.current).toHaveProperty('handlePreview');
    expect(result.current).toHaveProperty('handleDelete');
  });

  it('handleEdit is a function', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    expect(typeof result.current.handleEdit).toBe('function');

    act(() => {
      result.current.handleEdit(mockTemplate);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Edit template:', mockTemplate);
  });

  it('handleClone is a function', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    expect(typeof result.current.handleClone).toBe('function');

    act(() => {
      result.current.handleClone(mockTemplate);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Clone template:', mockTemplate);
  });

  it('handleSetAsDefault is a function', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    expect(typeof result.current.handleSetAsDefault).toBe('function');

    act(() => {
      result.current.handleSetAsDefault(mockTemplate);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Set as default template:', mockTemplate);
  });

  it('handleExport is a function', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    expect(typeof result.current.handleExport).toBe('function');

    act(() => {
      result.current.handleExport(mockTemplate);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Export template:', mockTemplate);
  });

  it('handlePreview is a function', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    expect(typeof result.current.handlePreview).toBe('function');

    act(() => {
      result.current.handlePreview(mockTemplate);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Preview template:', mockTemplate);
  });

  it('handleDelete is a function', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    expect(typeof result.current.handleDelete).toBe('function');

    act(() => {
      result.current.handleDelete(mockTemplate);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Delete template:', mockTemplate);
  });

  it('handlers are stable between renders', () => {
    const { result, rerender } = renderHook(() => useTemplatesActions(), { wrapper });

    const firstRenderHandlers = { ...result.current };

    rerender();

    expect(result.current.handleEdit).toBe(firstRenderHandlers.handleEdit);
    expect(result.current.handleClone).toBe(firstRenderHandlers.handleClone);
    expect(result.current.handleSetAsDefault).toBe(firstRenderHandlers.handleSetAsDefault);
    expect(result.current.handleExport).toBe(firstRenderHandlers.handleExport);
    expect(result.current.handlePreview).toBe(firstRenderHandlers.handlePreview);
    expect(result.current.handleDelete).toBe(firstRenderHandlers.handleDelete);
  });
});
