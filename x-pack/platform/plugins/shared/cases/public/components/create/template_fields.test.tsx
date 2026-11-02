/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { stringify as yamlStringify } from 'yaml';

import { CreateCaseTemplateFields } from './template_fields';
import { renderWithTestingProviders } from '../../common/mock';
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';

const mockUseFormData = jest.fn();
const mockUseFormContext = jest.fn();
jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib', () => ({
  ...jest.requireActual('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib'),
  useFormData: (...args: unknown[]) => mockUseFormData(...args),
  useFormContext: () => mockUseFormContext(),
  UseField: () => null,
}));

const mockUseTemplateFormSync = jest.fn();
jest.mock('./use_template_form_sync', () => ({
  useTemplateFormSync: (...args: unknown[]) => mockUseTemplateFormSync(...args),
}));

const mockUseGetFieldDefinitions = jest.fn();
jest.mock('../field_library/hooks/use_get_field_definitions', () => ({
  useGetFieldDefinitions: (...args: unknown[]) => mockUseGetFieldDefinitions(...args),
}));

jest.mock('../templates_v2/field_types/field_types_registry', () => ({
  controlRegistry: {
    INPUT_TEXT: ({ name, label }: { name: string; label?: string }) => (
      <div data-test-subj={`control-${name}`}>{label ?? name}</div>
    ),
    INPUT_NUMBER: ({ name, label }: { name: string; label?: string }) => (
      <div data-test-subj={`control-${name}`}>{label ?? name}</div>
    ),
  },
}));

const mockUseResolvedFields = jest.fn();
jest.mock('../field_library/hooks/use_resolved_fields', () => ({
  useResolvedFields: (...args: unknown[]) => mockUseResolvedFields(...args),
}));

describe('CreateCaseTemplateFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFormContext.mockReturnValue({ setFieldValue: jest.fn() });
    mockUseGetFieldDefinitions.mockReturnValue({
      data: { fieldDefinitions: [] },
      isLoading: false,
    });
    mockUseResolvedFields.mockImplementation((fields: unknown[]) => ({
      resolvedFields: fields,
      isLoading: false,
    }));
  });

  it('renders nothing when no template is selected and no global fields', () => {
    mockUseFormData.mockReturnValue([{ templateId: '' }]);
    mockUseTemplateFormSync.mockReturnValue({ template: undefined, isLoading: false });

    const { container } = renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(container.textContent).toBe('');
    expect(screen.queryByText('Template not selected')).not.toBeInTheDocument();
  });

  it('renders nothing when template has empty fields array and no global fields', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        definition: { name: 'Empty', fields: [] },
      },
      isLoading: false,
    });

    const { container } = renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(container.textContent).toBe('');
    expect(screen.queryByText('Extended fields')).not.toBeInTheDocument();
  });

  it('renders nothing when template definition has no fields property and no global fields', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        definition: { name: 'No Fields' },
      },
      isLoading: false,
    });

    const { container } = renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(container.textContent).toBe('');
    expect(screen.queryByText('Template not selected')).not.toBeInTheDocument();
  });

  it('returns null when loading', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({ template: undefined, isLoading: true });

    const { container } = renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(container.textContent).toBe('');
  });

  it('renders template fields when template is loaded with fields', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        definition: {
          name: 'Test Template',
          fields: [
            { name: 'hostname', control: 'INPUT_TEXT', type: 'keyword', label: 'Host Name' },
            { name: 'effort', control: 'INPUT_NUMBER', type: 'integer', label: 'Effort Level' },
          ],
        },
      },
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(screen.getByTestId('create-case-custom-fields-title')).toHaveTextContent(
      'Custom fields'
    );
    expect(screen.getByTestId('control-hostname')).toHaveTextContent('Host Name');
    expect(screen.getByTestId('control-effort')).toHaveTextContent('Effort Level');
  });

  it('skips fields with unregistered control types', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        definition: {
          name: 'Test Template',
          fields: [
            { name: 'known', control: 'INPUT_TEXT', type: 'keyword', label: 'Known' },
            { name: 'unknown', control: 'UNKNOWN_TYPE', type: 'keyword', label: 'Unknown' },
          ],
        },
      },
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(screen.getByTestId('control-known')).toBeInTheDocument();
    expect(screen.queryByTestId('control-unknown')).not.toBeInTheDocument();
  });

  it('renders nothing when templateId is undefined and no global fields', () => {
    mockUseFormData.mockReturnValue([{ templateId: undefined }]);
    mockUseTemplateFormSync.mockReturnValue({ template: undefined, isLoading: false });

    const { container } = renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(container.textContent).toBe('');
    expect(screen.queryByText('Template not selected')).not.toBeInTheDocument();
  });

  it('renders global fields when no template is selected but isGlobal defs exist', () => {
    mockUseFormData.mockReturnValue([{ templateId: undefined }]);
    mockUseTemplateFormSync.mockReturnValue({ template: undefined, isLoading: false });
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-1',
            name: 'incident_type',
            definition: yamlStringify({
              name: 'incident_type',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Incident Type',
            }),
            owner: 'securitySolution',
            isGlobal: true,
          },
        ],
      },
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(screen.queryByText('Extended fields')).not.toBeInTheDocument();
    expect(screen.getByTestId('control-incident_type')).toBeInTheDocument();
    expect(screen.queryByText('Template not selected')).not.toBeInTheDocument();
  });

  it('renders global fields when no template is selected even if useResolvedFields reports isLoading (react-query v4 disabled-query regression)', () => {
    // FAILURE SCENARIO: react-query v4 keeps disabled queries in isLoading:true state indefinitely.
    // When no template is selected, useResolvedFields calls useGetFieldDefinitions({owner: undefined}),
    // which is disabled and therefore stuck in isLoading:true. Without the fix, the loading guard
    // would swallow the component output and global fields would never appear.
    mockUseFormData.mockReturnValue([{ templateId: undefined }]);
    mockUseTemplateFormSync.mockReturnValue({ template: undefined, isLoading: false });
    mockUseResolvedFields.mockReturnValue({ resolvedFields: [], isLoading: true });
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-1',
            name: 'incident_type',
            definition: yamlStringify({
              name: 'incident_type',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Incident Type',
            }),
            owner: 'securitySolution',
            isGlobal: true,
          },
        ],
      },
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(screen.queryByText('Extended fields')).not.toBeInTheDocument();
    expect(screen.getByTestId('control-incident_type')).toBeInTheDocument();
  });

  it('hides a global field from the global section when the template references it via $ref', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        definition: {
          name: 'Test Template',
          fields: [
            { $ref: 'incident_type' },
            { name: 'hostname', control: 'INPUT_TEXT', type: 'keyword', label: 'Host Name' },
          ],
        },
      },
      isLoading: false,
    });
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-1',
            name: 'incident_type',
            definition: yamlStringify({
              name: 'incident_type',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Incident Type',
            }),
            owner: 'securitySolution',
            isGlobal: true,
          },
        ],
      },
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    // The template references incident_type via $ref — it should not appear in the global section.
    expect(screen.queryByText('Global fields')).not.toBeInTheDocument();
    expect(screen.queryByText('Extended fields')).not.toBeInTheDocument();
    expect(screen.queryByTestId('control-incident_type')).not.toBeInTheDocument();
  });

  it('hides a global field from the global section when the template $ref differs only in case', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        // Template links the field by its pre-rename casing.
        definition: { name: 'Test Template', fields: [{ $ref: 'incident_type' }] },
      },
      isLoading: false,
    });
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-1',
            // Definition was case-only renamed after the template linked it.
            name: 'Incident_Type',
            definition: yamlStringify({
              name: 'Incident_Type',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Incident Type',
            }),
            owner: 'securitySolution',
            isGlobal: true,
          },
        ],
      },
      isLoading: false,
    });
    // Simulate the real useResolvedFields case-insensitively resolving the $ref against
    // the (renamed) definition — mirrors what resolveTemplateFields actually does.
    mockUseResolvedFields.mockReturnValue({
      resolvedFields: [
        { name: 'Incident_Type', control: 'INPUT_TEXT', type: 'keyword', label: 'Incident Type' },
      ],
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    // Resolved once via the template section; must not also render via the global
    // section, whose exclusion check needs to match the same case-insensitive $ref.
    expect(screen.getAllByTestId('control-Incident_Type')).toHaveLength(1);
  });

  it('hides a global field linked to a legacy custom field that is currently visible', () => {
    mockUseFormData.mockReturnValue([{ templateId: undefined }]);
    mockUseTemplateFormSync.mockReturnValue({ template: undefined, isLoading: false });
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-1',
            name: 'priority',
            definition: yamlStringify({
              name: 'priority',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Priority',
            }),
            owner: 'securitySolution',
            isGlobal: true,
            legacyKey: 'cf_priority',
          },
        ],
      },
      isLoading: false,
    });

    renderWithTestingProviders(
      <CreateCaseTemplateFields visibleLegacyCustomFieldKeys={new Set(['cf_priority'])} />
    );

    // The legacy input for cf_priority is already visible elsewhere on the form — rendering
    // its linked global counterpart here too would double-submit the field (see prop doc).
    expect(screen.queryByTestId('control-priority')).not.toBeInTheDocument();
  });

  it('excludes a template $ref to a legacy-visible linked definition from rendering and form sync', () => {
    // REGRESSION (the bug this guards): with "show legacy custom fields" on, a migrated
    // template's $ref to the linked definition rendered a second control AND synced its default
    // into the submitted extended_fields — a dual-input conflict the server rejects.
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        owner: 'securitySolution',
        definition: {
          name: 'Migrated Template',
          fields: [
            { $ref: 'priority' },
            { name: 'hostname', control: 'INPUT_TEXT', type: 'keyword', label: 'Host Name' },
          ],
        },
      },
      isLoading: false,
    });
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-1',
            name: 'priority',
            definition: yamlStringify({
              name: 'priority',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Priority',
            }),
            owner: 'securitySolution',
            isGlobal: true,
            legacyKey: 'cf_priority',
          },
        ],
      },
      isLoading: false,
    });

    renderWithTestingProviders(
      <CreateCaseTemplateFields visibleLegacyCustomFieldKeys={new Set(['cf_priority'])} />
    );

    // The $ref to the linked definition is dropped BEFORE resolution — only the unrelated
    // inline field reaches useResolvedFields and renders.
    expect(mockUseResolvedFields).toHaveBeenLastCalledWith(
      [{ name: 'hostname', control: 'INPUT_TEXT', type: 'keyword', label: 'Host Name' }],
      'securitySolution'
    );
    expect(screen.queryByTestId('control-priority')).not.toBeInTheDocument();
    expect(screen.getByTestId('control-hostname')).toBeInTheDocument();

    // The same exclusion reaches the form-sync hook so no default is submitted either.
    expect(mockUseTemplateFormSync).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.any(Set),
      new Set(['priority'])
    );
  });

  it('resolves and syncs a template $ref to a linked definition normally when legacy fields are hidden', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        owner: 'securitySolution',
        definition: { name: 'Migrated Template', fields: [{ $ref: 'priority' }] },
      },
      isLoading: false,
    });
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-1',
            name: 'priority',
            definition: yamlStringify({
              name: 'priority',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Priority',
            }),
            owner: 'securitySolution',
            isGlobal: true,
            legacyKey: 'cf_priority',
          },
        ],
      },
      isLoading: false,
    });
    // Simulate the real useResolvedFields resolving the $ref against the library definition.
    mockUseResolvedFields.mockImplementation((fields: Array<{ $ref?: string }>) => ({
      resolvedFields: fields.map((f) =>
        f.$ref === 'priority'
          ? { name: 'priority', control: 'INPUT_TEXT', type: 'keyword', label: 'Priority' }
          : f
      ),
      isLoading: false,
    }));

    renderWithTestingProviders(
      <CreateCaseTemplateFields visibleLegacyCustomFieldKeys={new Set()} />
    );

    // Legacy input is hidden — the template field must render and sync normally.
    expect(mockUseResolvedFields).toHaveBeenLastCalledWith(
      [{ $ref: 'priority' }],
      'securitySolution'
    );
    expect(screen.getByTestId('control-priority')).toBeInTheDocument();
    expect(mockUseTemplateFormSync).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.any(Set),
      new Set()
    );
  });

  it('keeps an unrelated inline template field visible even when its name matches an excluded definition', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        owner: 'securitySolution',
        definition: {
          name: 'Template',
          // Inline template-local field that happens to share the excluded definition's name.
          fields: [
            {
              name: 'priority',
              control: 'INPUT_TEXT',
              type: 'keyword',
              label: 'Template-local priority',
            },
          ],
        },
      },
      isLoading: false,
    });
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-1',
            name: 'priority',
            definition: yamlStringify({
              name: 'priority',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Priority',
            }),
            owner: 'securitySolution',
            isGlobal: true,
            legacyKey: 'cf_priority',
          },
        ],
      },
      isLoading: false,
    });

    renderWithTestingProviders(
      <CreateCaseTemplateFields visibleLegacyCustomFieldKeys={new Set(['cf_priority'])} />
    );

    // Exclusion is by $ref identity, not by name — the inline field must stay.
    expect(screen.getByTestId('control-priority')).toHaveTextContent('Template-local priority');
  });

  it('removes a stale linked storage key from form state when legacy visibility turns on after initialization', async () => {
    // The "show legacy custom fields" switch can be forced on asynchronously (once the
    // configuration finishes loading and reveals a required field without a default). Any
    // default already applied for the linked definition must be scrubbed from the mirrored
    // extended_fields, or it would submit alongside the legacy input.
    const setFieldValue = jest.fn();
    mockUseFormContext.mockReturnValue({ setFieldValue });
    mockUseFormData.mockReturnValue([{ templateId: undefined }]);
    mockUseTemplateFormSync.mockReturnValue({ template: undefined, isLoading: false });
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-1',
            name: 'priority',
            definition: yamlStringify({
              name: 'priority',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Priority',
              metadata: { default: 'high' },
            }),
            owner: 'securitySolution',
            isGlobal: true,
            legacyKey: 'cf_priority',
          },
        ],
      },
      isLoading: false,
    });

    const { rerender } = renderWithTestingProviders(
      <CreateCaseTemplateFields visibleLegacyCustomFieldKeys={new Set()} />
    );

    // Legacy hidden: the linked global field's default lands in the mirrored map.
    await waitFor(() => {
      expect(setFieldValue).toHaveBeenCalledWith(
        CASE_EXTENDED_FIELDS,
        expect.objectContaining({ priority_as_keyword: 'high' })
      );
    });

    rerender(<CreateCaseTemplateFields visibleLegacyCustomFieldKeys={new Set(['cf_priority'])} />);

    // Legacy now visible: the stale linked storage key must be gone from the mirrored map.
    await waitFor(() => {
      const lastMirror = setFieldValue.mock.calls
        .filter(([key]) => key === CASE_EXTENDED_FIELDS)
        .pop();
      expect(lastMirror?.[1]).not.toHaveProperty('priority_as_keyword');
    });
  });

  it('shows a global field linked to a legacy custom field that is NOT currently visible', () => {
    mockUseFormData.mockReturnValue([{ templateId: undefined }]);
    mockUseTemplateFormSync.mockReturnValue({ template: undefined, isLoading: false });
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-1',
            name: 'priority',
            definition: yamlStringify({
              name: 'priority',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Priority',
            }),
            owner: 'securitySolution',
            isGlobal: true,
            legacyKey: 'cf_priority',
          },
        ],
      },
      isLoading: false,
    });

    renderWithTestingProviders(
      <CreateCaseTemplateFields visibleLegacyCustomFieldKeys={new Set()} />
    );

    expect(screen.getByTestId('control-priority')).toBeInTheDocument();
  });

  it('shows a global field when it is NOT referenced by the template', () => {
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        definition: {
          name: 'Test Template',
          fields: [
            { name: 'hostname', control: 'INPUT_TEXT', type: 'keyword', label: 'Host Name' },
          ],
        },
      },
      isLoading: false,
    });
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-1',
            name: 'incident_type',
            definition: yamlStringify({
              name: 'incident_type',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Incident Type',
            }),
            owner: 'securitySolution',
            isGlobal: true,
          },
        ],
      },
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    expect(screen.queryByText('Extended fields')).not.toBeInTheDocument();
    expect(screen.getByTestId('control-incident_type')).toBeInTheDocument();
  });

  it('applies global field defaults to the form when definitions load', async () => {
    const setFieldValue = jest.fn();
    mockUseFormContext.mockReturnValue({ setFieldValue });
    mockUseFormData.mockReturnValue([{ templateId: undefined }]);
    mockUseTemplateFormSync.mockReturnValue({ template: undefined, isLoading: false });
    mockUseGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-1',
            name: 'incident_type',
            definition: yamlStringify({
              name: 'incident_type',
              type: 'keyword',
              control: 'INPUT_TEXT',
              label: 'Incident Type',
              metadata: { default: 'critical' },
            }),
            owner: 'securitySolution',
            isGlobal: true,
          },
        ],
      },
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    // The default value is applied via innerForm.reset(), which triggers the watch
    // subscription that syncs to the parent form via setFieldValue.
    await waitFor(() => {
      expect(setFieldValue).toHaveBeenCalledWith(
        CASE_EXTENDED_FIELDS,
        expect.objectContaining({ incident_type_as_keyword: 'critical' })
      );
    });
  });

  it('syncs inner form changes to parent form under the CASE_EXTENDED_FIELDS key', () => {
    const setFieldValue = jest.fn();
    mockUseFormContext.mockReturnValue({ setFieldValue });
    mockUseFormData.mockReturnValue([{ templateId: 'template-1' }]);
    mockUseTemplateFormSync.mockReturnValue({
      template: {
        templateId: 'template-1',
        definition: { name: 'Test', fields: [] },
      },
      isLoading: false,
    });

    renderWithTestingProviders(<CreateCaseTemplateFields />);

    const allCallsWithWrongKey = setFieldValue.mock.calls.filter(
      ([key]) => key === 'extendedFields'
    );
    expect(allCallsWithWrongKey).toHaveLength(0);

    const extendedFieldCalls = setFieldValue.mock.calls.filter(
      ([key]) => key === CASE_EXTENDED_FIELDS
    );
    extendedFieldCalls.forEach(([key]) => {
      expect(key).toBe(CASE_EXTENDED_FIELDS);
    });
  });
});
