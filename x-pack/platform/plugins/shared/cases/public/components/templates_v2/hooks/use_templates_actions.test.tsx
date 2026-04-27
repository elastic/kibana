/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import type { Template } from '../../../../common/types/domain/template/v1';
import { TestProviders } from '../../../common/mock';
import { useTemplatesActions } from './use_templates_actions';
import { useCasesEditTemplateNavigation } from '../../../common/navigation';
import { useBulkDeleteTemplates } from './use_bulk_delete_templates';
import { useCreateTemplate } from './use_create_template';
import { useUpdateTemplate } from './use_update_template';
import { useBulkExportTemplates } from './use_bulk_export_templates';
import { useCasesToast } from '../../../common/use_cases_toast';

jest.mock('../../../common/navigation/hooks', () => ({
  ...jest.requireActual('../../../common/navigation/hooks'),
  useCasesEditTemplateNavigation: jest.fn(),
}));

jest.mock('./use_bulk_delete_templates');
jest.mock('./use_create_template');
jest.mock('./use_update_template');
jest.mock('./use_bulk_export_templates');
jest.mock('../../../common/use_cases_toast');

const useCasesEditTemplateNavigationMock = useCasesEditTemplateNavigation as jest.Mock;
const useBulkDeleteTemplatesMock = useBulkDeleteTemplates as jest.Mock;
const useCreateTemplateMock = useCreateTemplate as jest.Mock;
const useUpdateTemplateMock = useUpdateTemplate as jest.Mock;
const useBulkExportTemplatesMock = useBulkExportTemplates as jest.Mock;
const useCasesToastMock = useCasesToast as jest.Mock;

describe('useTemplatesActions', () => {
  const wrapper = ({ children }: React.PropsWithChildren<{}>) => (
    <TestProviders>{children}</TestProviders>
  );

  const mockTemplate: Template = {
    templateId: 'template-1',
    name: 'Template 1',
    owner: 'securitySolution',
    definition:
      'name: Template 1\nfields:\n  - name: field1\n    control: INPUT_TEXT\n    type: keyword',
    templateVersion: 1,
    deletedAt: null,
    description: 'Description',
    fieldCount: 5,
    tags: ['tag1'],
    author: 'user1',
    lastUsedAt: '2024-01-01T00:00:00.000Z',
    usageCount: 10,
    isDefault: false,
  };

  let consoleSpy: jest.SpyInstance;
  const navigateToCasesEditTemplateMock = jest.fn();
  const bulkDeleteTemplatesMock = jest.fn();
  const cloneTemplateMock = jest.fn();
  const updateTemplateMock = jest.fn();
  const bulkExportTemplatesMock = jest.fn();
  const showSuccessToastMock = jest.fn();

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    useCasesEditTemplateNavigationMock.mockReturnValue({
      navigateToCasesEditTemplate: navigateToCasesEditTemplateMock,
      getCasesEditTemplateUrl: jest.fn(),
    });
    useBulkDeleteTemplatesMock.mockReturnValue({
      mutate: bulkDeleteTemplatesMock,
      isLoading: false,
    });
    useCreateTemplateMock.mockReturnValue({
      mutate: cloneTemplateMock,
      isLoading: false,
    });
    useUpdateTemplateMock.mockReturnValue({
      mutate: updateTemplateMock,
      isLoading: false,
    });
    useBulkExportTemplatesMock.mockReturnValue({
      mutate: bulkExportTemplatesMock,
      isLoading: false,
    });
    useCasesToastMock.mockReturnValue({
      showSuccessToast: showSuccessToastMock,
      showErrorToast: jest.fn(),
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
    expect(result.current).toHaveProperty('handleExport');
    expect(result.current).toHaveProperty('handleDelete');
    expect(result.current).toHaveProperty('confirmDelete');
    expect(result.current).toHaveProperty('cancelDelete');
    expect(result.current).toHaveProperty('templateToDelete');
    expect(result.current).toHaveProperty('isDeleting');
    expect(result.current).toHaveProperty('isCloning');
    expect(result.current).toHaveProperty('isExporting');
    expect(result.current).toHaveProperty('isUpdating');
    expect(result.current).toHaveProperty('handleIsEnabledChange');
  });

  it('handleEdit navigates to edit template page', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    expect(typeof result.current.handleEdit).toBe('function');

    act(() => {
      result.current.handleEdit(mockTemplate);
    });

    expect(navigateToCasesEditTemplateMock).toHaveBeenCalledWith({
      templateId: mockTemplate.templateId,
    });
  });

  it('handleClone calls cloneTemplate mutation with cloned name in YAML definition', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    act(() => {
      result.current.handleClone(mockTemplate);
    });

    const callArgs = cloneTemplateMock.mock.calls[0][0];
    expect(callArgs.template.owner).toBe(mockTemplate.owner);
    expect(callArgs.template.description).toBe(mockTemplate.description);
    expect(callArgs.template.tags).toEqual(mockTemplate.tags);
    // The definition should be a YAML string with the cloned name
    expect(typeof callArgs.template.definition).toBe('string');
    expect(callArgs.template.definition).toContain('Cloned: Template 1');
    expect(cloneTemplateMock).toHaveBeenCalledWith(expect.anything(), {
      onSuccess: expect.any(Function),
    });
  });

  it('handleClone does not pass author, fieldCount, fieldNames, or isDefault', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    act(() => {
      result.current.handleClone(mockTemplate);
    });

    const { template } = cloneTemplateMock.mock.calls[0][0];
    expect(template).not.toHaveProperty('author');
    expect(template).not.toHaveProperty('fieldCount');
    expect(template).not.toHaveProperty('fieldNames');
    expect(template).not.toHaveProperty('isDefault');
  });

  it('handleClone passes isEnabled from template when isEnabled is true', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });
    const enabledTemplate = { ...mockTemplate, isEnabled: true };

    act(() => {
      result.current.handleClone(enabledTemplate);
    });

    const { template } = cloneTemplateMock.mock.calls[0][0];
    expect(template.isEnabled).toBe(true);
  });

  it('handleClone passes isEnabled from template when isEnabled is false', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });
    const disabledTemplate = { ...mockTemplate, isEnabled: false };

    act(() => {
      result.current.handleClone(disabledTemplate);
    });

    const { template } = cloneTemplateMock.mock.calls[0][0];
    expect(template.isEnabled).toBe(false);
  });

  it('handleClone passes isEnabled as undefined when template has no isEnabled property', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    act(() => {
      result.current.handleClone(mockTemplate);
    });

    const { template } = cloneTemplateMock.mock.calls[0][0];
    expect(template.isEnabled).toBeUndefined();
  });

  it('handleClone handles definition that is already a parsed object', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    const templateWithParsedDef = {
      ...mockTemplate,
      // Simulate the parsed object that the list endpoint actually returns
      definition: {
        name: 'Template 1',
        fields: [{ name: 'field1', control: 'INPUT_TEXT', type: 'keyword' }],
      } as unknown as string,
    };

    act(() => {
      result.current.handleClone(templateWithParsedDef);
    });

    const { template } = cloneTemplateMock.mock.calls[0][0];
    expect(typeof template.definition).toBe('string');
    expect(template.definition).toContain('Cloned: Template 1');
    expect(template.definition).toContain('field1');
  });

  it('configures useCreateTemplate with disabled default toast for clone', () => {
    renderHook(() => useTemplatesActions(), { wrapper });

    expect(useCreateTemplateMock).toHaveBeenCalledWith({
      disableDefaultSuccessToast: true,
    });
  });

  it('configures useUpdateTemplate with disabled default toast for isEnabled toggle', () => {
    renderHook(() => useTemplatesActions(), { wrapper });

    expect(useUpdateTemplateMock).toHaveBeenCalledWith({
      disableDefaultSuccessToast: true,
    });
  });

  it('shows custom success toast with original template name when clone succeeds', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    act(() => {
      result.current.handleClone(mockTemplate);
    });

    // Get the onSuccess callback passed to cloneTemplate mutate call
    const onSuccessCallback = cloneTemplateMock.mock.calls[0][1].onSuccess;

    // Simulate successful clone
    act(() => {
      onSuccessCallback();
    });

    expect(showSuccessToastMock).toHaveBeenCalledWith('Template 1 was cloned successfully');
  });

  it('handleExport calls bulk export mutation with template id', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    expect(typeof result.current.handleExport).toBe('function');

    act(() => {
      result.current.handleExport(mockTemplate);
    });

    expect(bulkExportTemplatesMock).toHaveBeenCalledWith({
      templateIds: [mockTemplate.templateId],
    });
  });

  it('handleDelete sets templateToDelete', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    expect(result.current.templateToDelete).toBeNull();

    act(() => {
      result.current.handleDelete(mockTemplate);
    });

    expect(result.current.templateToDelete).toEqual(mockTemplate);
  });

  it('confirmDelete calls bulk delete mutation and clears templateToDelete', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    act(() => {
      result.current.handleDelete(mockTemplate);
    });

    expect(result.current.templateToDelete).toEqual(mockTemplate);

    act(() => {
      result.current.confirmDelete();
    });

    expect(bulkDeleteTemplatesMock).toHaveBeenCalledWith({
      templateIds: [mockTemplate.templateId],
    });
    expect(result.current.templateToDelete).toBeNull();
  });

  it('passes onDeleteSuccess to useBulkDeleteTemplates hook', () => {
    const onDeleteSuccessMock = jest.fn();
    renderHook(() => useTemplatesActions({ onDeleteSuccess: onDeleteSuccessMock }), {
      wrapper,
    });

    // Verify useBulkDeleteTemplates was called with the onSuccess callback
    expect(useBulkDeleteTemplatesMock).toHaveBeenCalledWith({
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

    expect(bulkDeleteTemplatesMock).not.toHaveBeenCalled();
    expect(result.current.templateToDelete).toBeNull();
  });

  it('handleIsEnabledChange calls updateTemplate mutation with toggled isEnabled', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    const templateWithEnabled = { ...mockTemplate, isEnabled: true };
    act(() => {
      result.current.handleIsEnabledChange(templateWithEnabled);
    });

    expect(updateTemplateMock).toHaveBeenCalledWith(
      {
        templateId: templateWithEnabled.templateId,
        template: { isEnabled: false },
      },
      { onSuccess: expect.any(Function) }
    );

    const onSuccessCallback = updateTemplateMock.mock.calls[0][1].onSuccess;
    act(() => {
      onSuccessCallback();
    });
    expect(showSuccessToastMock).toHaveBeenCalledWith('Template updated successfully');
  });

  it('handleIsEnabledChange sends isEnabled: false when template.isEnabled is undefined (treated as enabled)', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    // isEnabled is undefined — treated as enabled per column logic (isEnabled !== false)
    const templateWithUndefined = { ...mockTemplate };
    act(() => {
      result.current.handleIsEnabledChange(templateWithUndefined);
    });

    expect(updateTemplateMock).toHaveBeenCalledWith(
      {
        templateId: mockTemplate.templateId,
        template: { isEnabled: false },
      },
      { onSuccess: expect.any(Function) }
    );
  });

  it('handleIsEnabledChange sends isEnabled: true when template.isEnabled is false', () => {
    const { result } = renderHook(() => useTemplatesActions(), { wrapper });

    const disabledTemplate = { ...mockTemplate, isEnabled: false };
    act(() => {
      result.current.handleIsEnabledChange(disabledTemplate);
    });

    expect(updateTemplateMock).toHaveBeenCalledWith(
      {
        templateId: mockTemplate.templateId,
        template: { isEnabled: true },
      },
      { onSuccess: expect.any(Function) }
    );
  });

  it('handlers are stable between renders', () => {
    const { result, rerender } = renderHook(() => useTemplatesActions(), { wrapper });

    const firstRenderHandlers = { ...result.current };

    rerender();

    expect(result.current.handleEdit).toBe(firstRenderHandlers.handleEdit);
    expect(result.current.handleClone).toBe(firstRenderHandlers.handleClone);
    expect(result.current.handleExport).toBe(firstRenderHandlers.handleExport);
    expect(result.current.handleDelete).toBe(firstRenderHandlers.handleDelete);
    expect(result.current.cancelDelete).toBe(firstRenderHandlers.cancelDelete);
    expect(result.current.handleIsEnabledChange).toBe(firstRenderHandlers.handleIsEnabledChange);
  });
});
