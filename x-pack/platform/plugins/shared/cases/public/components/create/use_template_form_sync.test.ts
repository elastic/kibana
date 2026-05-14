/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useTemplateFormSync } from './use_template_form_sync';
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';

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

const mockUseGetFieldDefinitions = jest.fn();
jest.mock('../field_library/hooks/use_get_field_definitions', () => ({
  useGetFieldDefinitions: (...args: unknown[]) => mockUseGetFieldDefinitions(...args),
}));

const mockUseParentTemplateDefinition = jest.fn((_id: string | undefined) => ({
  definition: undefined,
  isFetched: true,
}));
jest.mock('../templates_v2/hooks/use_parent_template_definition', () => ({
  useParentTemplateDefinition: (id: string | undefined) => mockUseParentTemplateDefinition(id),
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

const mockTemplateWithExtendedFields = {
  templateId: 'template-2',
  templateVersion: 1,
  definition: {
    name: 'Template with Fields',
    description: 'Has extended fields',
    tags: [],
    severity: 'low',
    category: null,
    fields: [
      {
        name: 'summary',
        type: 'keyword',
        control: 'INPUT_TEXT',
        metadata: { default: 'Default summary' },
      },
      {
        name: 'effort',
        type: 'integer',
        control: 'INPUT_NUMBER',
        metadata: { default: 42 },
      },
      {
        name: 'priority',
        type: 'keyword',
        control: 'SELECT_BASIC',
        metadata: { default: 'high', options: ['low', 'medium', 'high'] },
      },
      {
        name: 'notes',
        type: 'keyword',
        control: 'TEXTAREA',
      },
    ],
  },
};

describe('useTemplateFormSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetFieldDefinitions.mockReturnValue({
      data: { fieldDefinitions: [] },
      isLoading: false,
    });
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

  describe('extended fields', () => {
    it('applies default values for extended fields when template has fields', () => {
      mockUseFormData.mockReturnValue([{ templateId: 'template-2' }]);
      mockUseGetTemplate.mockReturnValue({
        data: mockTemplateWithExtendedFields,
        isLoading: false,
      });

      renderHook(() => useTemplateFormSync());

      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.summary_as_keyword`,
        'Default summary'
      );
      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.effort_as_integer`,
        '42'
      );
      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.priority_as_keyword`,
        'high'
      );
    });

    it('sets empty string for extended fields without default value', () => {
      mockUseFormData.mockReturnValue([{ templateId: 'template-2' }]);
      mockUseGetTemplate.mockReturnValue({
        data: mockTemplateWithExtendedFields,
        isLoading: false,
      });

      renderHook(() => useTemplateFormSync());

      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.notes_as_keyword`,
        ''
      );
    });

    it('clears extended fields when template is deselected', () => {
      mockUseFormData.mockReturnValue([{ templateId: 'template-2' }]);
      mockUseGetTemplate.mockReturnValue({
        data: mockTemplateWithExtendedFields,
        isLoading: false,
      });

      const { rerender } = renderHook(() => useTemplateFormSync());

      mockSetFieldValue.mockClear();
      mockUseFormData.mockReturnValue([{ templateId: '' }]);
      mockUseGetTemplate.mockReturnValue({ data: undefined, isLoading: false });

      rerender();

      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.summary_as_keyword`,
        ''
      );
      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.effort_as_integer`,
        ''
      );
      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.priority_as_keyword`,
        ''
      );
      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.notes_as_keyword`,
        ''
      );
    });

    it('does not clear extended fields if no template was previously applied', () => {
      mockUseFormData.mockReturnValue([{ templateId: '' }]);
      mockUseGetTemplate.mockReturnValue({ data: undefined, isLoading: false });

      renderHook(() => useTemplateFormSync());

      const extendedFieldCalls = mockSetFieldValue.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].startsWith(CASE_EXTENDED_FIELDS)
      );
      expect(extendedFieldCalls).toHaveLength(0);
    });

    it('handles switching between templates with different fields', () => {
      mockUseFormData.mockReturnValue([{ templateId: 'template-2' }]);
      mockUseGetTemplate.mockReturnValue({
        data: mockTemplateWithExtendedFields,
        isLoading: false,
      });

      const { rerender } = renderHook(() => useTemplateFormSync());

      mockSetFieldValue.mockClear();

      const differentTemplate = {
        templateId: 'template-3',
        templateVersion: 1,
        definition: {
          name: 'Different Template',
          fields: [
            {
              name: 'other_field',
              type: 'keyword',
              control: 'INPUT_TEXT',
              metadata: { default: 'other value' },
            },
          ],
        },
      };

      mockUseFormData.mockReturnValue([{ templateId: 'template-3' }]);
      mockUseGetTemplate.mockReturnValue({ data: differentTemplate, isLoading: false });

      rerender();

      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.other_field_as_keyword`,
        'other value'
      );
    });

    it('converts numeric default values to strings', () => {
      const templateWithNumericDefaults = {
        templateId: 'template-numeric',
        templateVersion: 1,
        definition: {
          name: 'Numeric Template',
          fields: [
            {
              name: 'count',
              type: 'integer',
              control: 'INPUT_NUMBER',
              metadata: { default: 0 },
            },
            {
              name: 'score',
              type: 'float',
              control: 'INPUT_NUMBER',
              metadata: { default: 3.14 },
            },
          ],
        },
      };

      mockUseFormData.mockReturnValue([{ templateId: 'template-numeric' }]);
      mockUseGetTemplate.mockReturnValue({ data: templateWithNumericDefaults, isLoading: false });

      renderHook(() => useTemplateFormSync());

      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.count_as_integer`,
        '0'
      );
      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.score_as_float`,
        '3.14'
      );
    });

    it('does not apply extended fields when template has no fields array', () => {
      const templateWithoutFields = {
        templateId: 'template-no-fields',
        templateVersion: 1,
        definition: {
          name: 'No Fields Template',
        },
      };

      mockUseFormData.mockReturnValue([{ templateId: 'template-no-fields' }]);
      mockUseGetTemplate.mockReturnValue({ data: templateWithoutFields, isLoading: false });

      renderHook(() => useTemplateFormSync());

      const extendedFieldCalls = mockSetFieldValue.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].startsWith(CASE_EXTENDED_FIELDS)
      );
      expect(extendedFieldCalls).toHaveLength(0);
    });
  });

  describe('field definitions loading guard', () => {
    it('does not apply extended field defaults while field defs are loading', () => {
      mockUseFormData.mockReturnValue([{ templateId: 'template-2' }]);
      mockUseGetTemplate.mockReturnValue({
        data: mockTemplateWithExtendedFields,
        isLoading: false,
      });
      mockUseGetFieldDefinitions.mockReturnValue({ data: undefined, isLoading: true });

      renderHook(() => useTemplateFormSync());

      const extendedFieldCalls = mockSetFieldValue.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].startsWith(CASE_EXTENDED_FIELDS)
      );
      expect(extendedFieldCalls).toHaveLength(0);
    });

    it('applies extended field defaults once field defs finish loading', () => {
      mockUseFormData.mockReturnValue([{ templateId: 'template-2' }]);
      mockUseGetTemplate.mockReturnValue({
        data: mockTemplateWithExtendedFields,
        isLoading: false,
      });
      mockUseGetFieldDefinitions.mockReturnValue({ data: undefined, isLoading: true });

      const { rerender } = renderHook(() => useTemplateFormSync());

      mockSetFieldValue.mockClear();

      mockUseGetFieldDefinitions.mockReturnValue({
        data: { fieldDefinitions: [] },
        isLoading: false,
      });

      rerender();

      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.summary_as_keyword`,
        'Default summary'
      );
    });
  });

  describe('$ref field resolution', () => {
    const templateWithRef = {
      templateId: 'template-ref',
      templateVersion: 1,
      owner: 'securitySolution',
      definition: {
        name: 'Ref Template',
        fields: [{ $ref: 'my_field', name: undefined }],
      },
    };

    it('resolves $ref fields from the library and applies their defaults', () => {
      const libraryField = {
        name: 'my_field',
        owner: 'securitySolution',
        fieldDefinitionId: 'fd-1',
        definition:
          'name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\nmetadata:\n  default: lib_default\n',
      };

      mockUseFormData.mockReturnValue([{ templateId: 'template-ref' }]);
      mockUseGetTemplate.mockReturnValue({ data: templateWithRef, isLoading: false });
      mockUseGetFieldDefinitions.mockReturnValue({
        data: { fieldDefinitions: [libraryField] },
        isLoading: false,
      });

      renderHook(() => useTemplateFormSync());

      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.my_field_as_keyword`,
        'lib_default'
      );
    });

    it('silently skips $ref entries with an unknown name', () => {
      mockUseFormData.mockReturnValue([{ templateId: 'template-ref' }]);
      mockUseGetTemplate.mockReturnValue({ data: templateWithRef, isLoading: false });
      mockUseGetFieldDefinitions.mockReturnValue({
        data: { fieldDefinitions: [] },
        isLoading: false,
      });

      renderHook(() => useTemplateFormSync());

      const extendedFieldCalls = mockSetFieldValue.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].startsWith(CASE_EXTENDED_FIELDS)
      );
      expect(extendedFieldCalls).toHaveLength(0);
    });

    it('uses the override name when $ref entry has a name property', () => {
      const libraryField = {
        name: 'my_field',
        owner: 'securitySolution',
        fieldDefinitionId: 'fd-1',
        definition:
          'name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\nmetadata:\n  default: lib_default\n',
      };
      const templateWithNamedRef = {
        templateId: 'template-named-ref',
        templateVersion: 1,
        owner: 'securitySolution',
        definition: {
          name: 'Named Ref Template',
          fields: [{ $ref: 'my_field', name: 'overridden_name' }],
        },
      };

      mockUseFormData.mockReturnValue([{ templateId: 'template-named-ref' }]);
      mockUseGetTemplate.mockReturnValue({ data: templateWithNamedRef, isLoading: false });
      mockUseGetFieldDefinitions.mockReturnValue({
        data: { fieldDefinitions: [libraryField] },
        isLoading: false,
      });

      renderHook(() => useTemplateFormSync());

      expect(mockSetFieldValue).toHaveBeenCalledWith(
        `${CASE_EXTENDED_FIELDS}.overridden_name_as_keyword`,
        'lib_default'
      );
    });
  });
});
