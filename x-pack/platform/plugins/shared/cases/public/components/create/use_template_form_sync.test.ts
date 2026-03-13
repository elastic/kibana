/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useTemplateFormSync } from './use_template_form_sync';

const mockSetFieldValue = jest.fn();
const mockUseFormContext = jest.fn(() => ({ setFieldValue: mockSetFieldValue }));
const mockUseFormData = jest.fn();

jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib', () => ({
  useFormContext: () => mockUseFormContext(),
  useFormData: (...args: unknown[]) => mockUseFormData(...args),
}));

const mockUseGetTemplate = jest.fn();
jest.mock('../templates_v2/hooks/use_get_template', () => ({
  useGetTemplate: (...args: unknown[]) => mockUseGetTemplate(...args),
}));

const mockTemplate = {
  templateId: 'template-1',
  templateVersion: 1,
  definition: {
    name: 'My Template',
    description: 'A description',
    tags: ['security', 'network'],
    severity: 'high',
    category: 'general',
    fields: [],
  },
};

describe('useTemplateFormSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the template and loading state', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseGetTemplate.mockReturnValue({ data: mockTemplate, isLoading: false });

    const { result } = renderHook(() => useTemplateFormSync());

    expect(result.current.template).toEqual(mockTemplate);
    expect(result.current.isLoading).toBe(false);
  });

  it('populates form fields when a template loads', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseGetTemplate.mockReturnValue({ data: mockTemplate, isLoading: false });

    renderHook(() => useTemplateFormSync());

    expect(mockSetFieldValue).toHaveBeenCalledWith('title', 'My Template');
    expect(mockSetFieldValue).toHaveBeenCalledWith('description', 'A description');
    expect(mockSetFieldValue).toHaveBeenCalledWith('tags', ['security', 'network']);
    expect(mockSetFieldValue).toHaveBeenCalledWith('severity', 'high');
    expect(mockSetFieldValue).toHaveBeenCalledWith('category', 'general');
  });

  it('resets form fields when templateId is cleared after a template was applied', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseGetTemplate.mockReturnValue({ data: mockTemplate, isLoading: false });

    const { rerender } = renderHook(() => useTemplateFormSync());

    mockSetFieldValue.mockClear();
    mockUseFormData.mockReturnValue([{ templateId: '' }]);
    mockUseGetTemplate.mockReturnValue({ data: undefined, isLoading: false });

    rerender();

    expect(mockSetFieldValue).toHaveBeenCalledWith('description', '');
    expect(mockSetFieldValue).toHaveBeenCalledWith('tags', []);
    expect(mockSetFieldValue).toHaveBeenCalledWith('severity', 'low');
    expect(mockSetFieldValue).toHaveBeenCalledWith('category', null);
  });

  it('does not reset fields when templateId was never set', () => {
    mockUseFormData.mockReturnValue([{ templateId: '' }]);
    mockUseGetTemplate.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useTemplateFormSync());

    expect(mockSetFieldValue).not.toHaveBeenCalled();
  });

  it('does not re-apply the same template and version', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseGetTemplate.mockReturnValue({ data: mockTemplate, isLoading: false });

    const { rerender } = renderHook(() => useTemplateFormSync());

    const firstCallCount = mockSetFieldValue.mock.calls.length;
    rerender();

    expect(mockSetFieldValue.mock.calls.length).toBe(firstCallCount);
  });

  it('re-applies when the template version changes', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseGetTemplate.mockReturnValue({ data: mockTemplate, isLoading: false });

    const { rerender } = renderHook(() => useTemplateFormSync());

    mockSetFieldValue.mockClear();
    const updatedTemplate = { ...mockTemplate, templateVersion: 2 };
    mockUseGetTemplate.mockReturnValue({ data: updatedTemplate, isLoading: false });

    rerender();

    expect(mockSetFieldValue).toHaveBeenCalledWith('title', 'My Template');
  });

  it('skips fields that are empty or undefined in the definition', () => {
    const partialTemplate = {
      ...mockTemplate,
      definition: {
        name: 'Partial',
        fields: [],
      },
    };

    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseGetTemplate.mockReturnValue({ data: partialTemplate, isLoading: false });

    renderHook(() => useTemplateFormSync());

    expect(mockSetFieldValue).toHaveBeenCalledWith('title', 'Partial');
    expect(mockSetFieldValue).not.toHaveBeenCalledWith('description', expect.anything());
    expect(mockSetFieldValue).not.toHaveBeenCalledWith('tags', expect.anything());
    expect(mockSetFieldValue).not.toHaveBeenCalledWith('severity', expect.anything());
    expect(mockSetFieldValue).not.toHaveBeenCalledWith('category', expect.anything());
  });

  it('does not apply when template.templateId does not match current templateId', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-2' }]);
    mockUseGetTemplate.mockReturnValue({ data: mockTemplate, isLoading: false });

    renderHook(() => useTemplateFormSync());

    expect(mockSetFieldValue).not.toHaveBeenCalled();
  });

  it('returns isLoading true when the template is loading', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseGetTemplate.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useTemplateFormSync());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.template).toBeUndefined();
  });
});
