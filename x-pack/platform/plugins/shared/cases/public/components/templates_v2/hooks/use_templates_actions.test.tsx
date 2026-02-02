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
import { useCasesEditTemplateNavigation } from '../../../common/navigation';
import { useDeleteTemplate } from './use_delete_template';

jest.mock('../../../common/navigation/hooks', () => ({
  ...jest.requireActual('../../../common/navigation/hooks'),
  useCasesEditTemplateNavigation: jest.fn(),
}));

jest.mock('./use_delete_template');

const useCasesEditTemplateNavigationMock = useCasesEditTemplateNavigation as jest.Mock;
const useDeleteTemplateMock = useDeleteTemplate as jest.Mock;

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
  const navigateToCasesEditTemplateMock = jest.fn();
  const deleteTemplateMock = jest.fn();

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    useCasesEditTemplateNavigationMock.mockReturnValue({
      navigateToCasesEditTemplate: navigateToCasesEditTemplateMock,
      getCasesEditTemplateUrl: jest.fn(),
    });
    useDeleteTemplateMock.mockReturnValue({
      mutate: deleteTemplateMock,
      isLoading: false,
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('returns all action handlers', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    expect(result.current).toHaveProperty('handleEdit');
    expect(result.current).toHaveProperty('handleClone');
    expect(result.current).toHaveProperty('handleSetAsDefault');
    expect(result.current).toHaveProperty('handleExport');
    expect(result.current).toHaveProperty('handleDelete');
    expect(result.current).toHaveProperty('confirmDelete');
    expect(result.current).toHaveProperty('cancelDelete');
    expect(result.current).toHaveProperty('templateToDelete');
    expect(result.current).toHaveProperty('isDeleting');
  });

  it('handleEdit navigates to edit template page', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    expect(typeof result.current.handleEdit).toBe('function');

    act(() => {
      result.current.handleEdit(mockTemplate);
    });

    expect(navigateToCasesEditTemplateMock).toHaveBeenCalledWith({
      templateId: mockTemplate.key,
    });
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

  it('handleDelete sets templateToDelete', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    expect(result.current.templateToDelete).toBeNull();

    act(() => {
      result.current.handleDelete(mockTemplate);
    });

    expect(result.current.templateToDelete).toEqual(mockTemplate);
  });

  it('confirmDelete calls deleteTemplate mutation and clears templateToDelete', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    act(() => {
      result.current.handleDelete(mockTemplate);
    });

    expect(result.current.templateToDelete).toEqual(mockTemplate);

    act(() => {
      result.current.confirmDelete();
    });

    expect(deleteTemplateMock).toHaveBeenCalledWith({ templateId: mockTemplate.key });
    expect(result.current.templateToDelete).toBeNull();
  });

  it('passes onDeleteSuccess to useDeleteTemplate hook', () => {
    const onDeleteSuccessMock = jest.fn();
    renderHook(() => useTemplatesActions({ onDeleteSuccess: onDeleteSuccessMock }), {
      wrapper,
    });

    // Verify useDeleteTemplate was called with the onSuccess callback
    expect(useDeleteTemplateMock).toHaveBeenCalledWith({
      onSuccess: onDeleteSuccessMock,
    });
  });

  it('cancelDelete clears templateToDelete without calling mutation', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    act(() => {
      result.current.handleDelete(mockTemplate);
    });

    expect(result.current.templateToDelete).toEqual(mockTemplate);

    act(() => {
      result.current.cancelDelete();
    });

    expect(deleteTemplateMock).not.toHaveBeenCalled();
    expect(result.current.templateToDelete).toBeNull();
  });

  it('handlers are stable between renders', () => {
    const { result, rerender } = renderHook(() => useTemplatesActions(), { wrapper });

    const firstRenderHandlers = { ...result.current };

    rerender();

    expect(result.current.handleEdit).toBe(firstRenderHandlers.handleEdit);
    expect(result.current.handleClone).toBe(firstRenderHandlers.handleClone);
    expect(result.current.handleSetAsDefault).toBe(firstRenderHandlers.handleSetAsDefault);
    expect(result.current.handleExport).toBe(firstRenderHandlers.handleExport);
    expect(result.current.handleDelete).toBe(firstRenderHandlers.handleDelete);
    expect(result.current.cancelDelete).toBe(firstRenderHandlers.cancelDelete);
  });
});
