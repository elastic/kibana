/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import type { MappedFieldsEditorProps } from '@kbn/index-management-shared-types';

import { DATASET_WIZARD_FLOW_396_MAPPED_FIELD_TYPES } from '../inferred_field_type_options';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import {
  DATASET_WIZARD_FLOW_VARIANT_3,
  DATASET_WIZARD_FLOW_VARIANT_3_9_6,
  type DatasetWizardFlowVariant,
} from '../dataset_wizard_flow_variant';
import type { TestConfigurationPreviewField } from '../test_configuration_preview_utils';
import { InferredSchemaMappingsEditor } from './inferred_schema_mappings_editor';

const FakeMappedFieldsEditor: FunctionComponent<MappedFieldsEditorProps> = ({
  value,
  onChange,
  fieldsDescription,
  afterFieldsDescription,
  autoOpenCreateFieldWhenEmpty = true,
  allowedRootFieldTypes,
  closeCreateFieldOnOutsideClick,
  inlineOptionalDateFormatField,
  sourceNameField,
  renameFieldField,
}) => {
  const [mappings, setMappings] = useState(value ?? {});
  const propertiesCount = Object.keys(
    (value as { properties?: Record<string, unknown> } | undefined)?.properties ?? {}
  ).length;
  const [isCreateFieldFormOpen, setIsCreateFieldFormOpen] = useState(
    autoOpenCreateFieldWhenEmpty && propertiesCount === 0
  );

  const properties =
    (mappings as { properties?: Record<string, { type?: string }> }).properties ?? {};

  const updateMappings = (nextMappings: Record<string, unknown>) => {
    setMappings(nextMappings);
    onChange({
      getData: () => nextMappings,
      validate: () => Promise.resolve(true),
      isValid: true,
    });
  };

  const addManualField = () => {
    setIsCreateFieldFormOpen(true);
  };

  const confirmManualField = () => {
    updateMappings({
      properties: {
        ...properties,
        manual_field: { type: 'keyword' },
      },
    });
    setIsCreateFieldFormOpen(false);
  };

  const deleteField = (name: string) => {
    const { [name]: _removed, ...remainingProperties } = properties;
    updateMappings({ properties: remainingProperties });
  };

  return (
    <div>
      <div data-test-subj="fakeAllowedRootFieldTypes">
        {JSON.stringify(allowedRootFieldTypes ?? null)}
      </div>
      <div data-test-subj="fakeCloseCreateFieldOnOutsideClick">
        {String(closeCreateFieldOnOutsideClick ?? 'default')}
      </div>
      <div data-test-subj="fakeInlineOptionalDateFormatField">
        {JSON.stringify(inlineOptionalDateFormatField ?? null)}
      </div>
      <div data-test-subj="fakeSourceNameField">
        {JSON.stringify(sourceNameField ?? null)}
      </div>
      <div data-test-subj="fakeRenameFieldField">
        {JSON.stringify(renameFieldField ?? null)}
      </div>
      {fieldsDescription ? (
        <div data-test-subj="fakeMappedFieldsDescription">{fieldsDescription}</div>
      ) : null}
      {afterFieldsDescription}
      <div data-test-subj="fakeMappedFieldsValue">{JSON.stringify(mappings)}</div>
      {Object.keys(properties).map((name) => (
        <button
          key={name}
          type="button"
          data-test-subj={`fakeDeleteField-${name}`}
          onClick={() => deleteField(name)}
        >
          Delete {name}
        </button>
      ))}
      {isCreateFieldFormOpen ? (
        <div data-test-subj="createFieldForm">
          <div data-test-subj="fakeCreateFieldFormPanel">
          <button type="button" data-test-subj="fakeConfirmAddField" onClick={confirmManualField}>
            Confirm field
          </button>
          <button
            type="button"
            data-test-subj="cancelButton"
            onClick={() => setIsCreateFieldFormOpen(false)}
          >
            Cancel
          </button>
          </div>
        </div>
      ) : null}
      <button type="button" data-test-subj="addFieldButton" onClick={addManualField}>
        Add field
      </button>
    </div>
  );
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      indexManagement: {
        getMappedFieldsEditorComponent: () => FakeMappedFieldsEditor,
      },
      scopedHistory: {
        createSubHistory: jest.fn(),
      },
    },
  }),
}));

const inferredFields: TestConfigurationPreviewField[] = [
  { name: '@timestamp', type: 'date' },
  { name: 'message', type: 'text' },
];

const TestHarness = ({
  automaticFieldTypes = {},
  flowVariant = DATASET_WIZARD_FLOW_VARIANT_3,
  format = '',
}: {
  automaticFieldTypes?: Record<string, string>;
  flowVariant?: DatasetWizardFlowVariant;
  format?: DatasetWizardFormValues['settings']['format'];
}) => {
  const { control, watch } = useForm<DatasetWizardFormValues>({
    defaultValues: {
      ...emptyDatasetWizardFormValues(),
      automatic_field_types: automaticFieldTypes,
      settings: {
        ...emptyDatasetWizardFormValues().settings,
        ...(format ? { format } : {}),
      },
    },
  });

  return (
    <EuiProvider>
      <I18nProvider>
        <InferredSchemaMappingsEditor
          control={control}
          flowVariant={flowVariant}
          inferredFields={inferredFields}
        />
        <span data-test-subj="automaticFieldTypesValue">
          {JSON.stringify(watch('automatic_field_types'))}
        </span>
      </I18nProvider>
    </EuiProvider>
  );
};

describe('InferredSchemaMappingsEditor', () => {
  it('renders Mapped fields above Dynamic fields without Infer missing fields', () => {
    const { getByTestId, queryByTestId } = render(<TestHarness />);

    expect(getByTestId('datasetWizardInferredSchemaMappingsEditor')).toBeInTheDocument();
    expect(getByTestId('datasetWizardMappedFields')).toBeInTheDocument();
    expect(getByTestId('datasetWizardDynamicFields')).toBeInTheDocument();
    expect(
      getByTestId('datasetWizardMappedFields').compareDocumentPosition(
        getByTestId('datasetWizardDynamicFields')
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(getByTestId('datasetWizardAddField')).toBeInTheDocument();
    expect(getByTestId('datasetWizardInferSchema')).toBeInTheDocument();
    expect(getByTestId('datasetWizardInferSchema')).toBeEnabled();
    expect(getByTestId('datasetWizardDynamicFieldsEnabled')).toBeChecked();
    expect(getByTestId('datasetWizardDynamicFieldsEmpty')).toBeInTheDocument();
    expect(queryByTestId('datasetWizardInferSchemaSplitButton')).toBeNull();
    expect(queryByTestId('datasetWizardInferMissingFields')).toBeNull();
  });

  it('fills Dynamic fields from Infer schema without writing mapped field types', async () => {
    const { getByTestId } = render(
      <TestHarness automaticFieldTypes={{ manual_field: 'keyword' }} />
    );

    fireEvent.click(getByTestId('datasetWizardInferSchema'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardDynamicFieldsTable')).toBeInTheDocument();
      expect(getByTestId('datasetWizardMapField-@timestamp')).toBeInTheDocument();
      expect(getByTestId('datasetWizardMapField-message')).toBeInTheDocument();
      expect(getByTestId('datasetWizardDynamicFieldsTable')).toHaveTextContent('Date');
      expect(getByTestId('datasetWizardDynamicFieldsTable')).toHaveTextContent('Text');
    });

    expect(getByTestId('automaticFieldTypesValue')).toHaveTextContent(
      JSON.stringify({ manual_field: 'keyword' })
    );
    expect(getByTestId('datasetWizardDynamicFieldsEmpty')).toBeInTheDocument();
  });

  it('maps a Dynamic field into Mapped and removes it from Dynamic', async () => {
    const { getByTestId, queryByTestId } = render(<TestHarness />);

    fireEvent.click(getByTestId('datasetWizardInferSchema'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardMapField-message')).toBeInTheDocument();
    });

    fireEvent.click(getByTestId('datasetWizardMapField-message'));

    await waitFor(() => {
      expect(getByTestId('automaticFieldTypesValue')).toHaveTextContent(
        JSON.stringify({ message: 'text' })
      );
      expect(queryByTestId('datasetWizardMapField-message')).toBeNull();
      expect(getByTestId('datasetWizardMapField-@timestamp')).toBeInTheDocument();
    });
  });

  it('returns a deleted mapping to Dynamic when it is still in the inferred snapshot', async () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness automaticFieldTypes={{ message: 'keyword' }} />
    );

    fireEvent.click(getByTestId('datasetWizardInferSchema'));

    await waitFor(() => {
      expect(queryByTestId('datasetWizardMapField-message')).toBeNull();
      expect(getByTestId('datasetWizardMapField-@timestamp')).toBeInTheDocument();
    });

    fireEvent.click(getByTestId('fakeDeleteField-message'));

    await waitFor(() => {
      expect(getByTestId('automaticFieldTypesValue')).toHaveTextContent('{}');
      expect(getByTestId('datasetWizardMapField-message')).toBeInTheDocument();
    });
  });

  it('does not overwrite existing mapped types when Infer schema runs', async () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness automaticFieldTypes={{ message: 'keyword' }} />
    );

    fireEvent.click(getByTestId('datasetWizardInferSchema'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardMapField-@timestamp')).toBeInTheDocument();
      expect(queryByTestId('datasetWizardMapField-message')).toBeNull();
    });

    expect(getByTestId('automaticFieldTypesValue')).toHaveTextContent(
      JSON.stringify({ message: 'keyword' })
    );
    expect(getByTestId('fakeMappedFieldsValue')).toHaveTextContent(
      JSON.stringify({ properties: { message: { type: 'keyword' } } })
    );
  });

  it('lets the user infer schema while Dynamic fields is off', async () => {
    const { getByTestId, queryByTestId } = render(<TestHarness />);

    fireEvent.click(getByTestId('datasetWizardDynamicFieldsEnabled'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardDynamicFieldsEnabled')).not.toBeChecked();
      expect(getByTestId('datasetWizardInferSchema')).toBeEnabled();
      expect(getByTestId('datasetWizardDynamicFieldsDisabled')).toBeInTheDocument();
      expect(queryByTestId('datasetWizardDynamicFieldsTable')).toBeNull();
    });

    fireEvent.click(getByTestId('datasetWizardInferSchema'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardDynamicFieldsTable')).toBeInTheDocument();
      expect(getByTestId('datasetWizardMapField-message')).toBeInTheDocument();
      expect(getByTestId('datasetWizardDynamicFieldsDisabled')).toBeInTheDocument();
    });
  });

  it('collapses the mapped fields section and reopens it to add a field', async () => {
    const { getByRole, getByTestId } = render(<TestHarness />);

    const accordionButton = getByRole('button', { name: 'Mapped fields (optional)' });
    expect(accordionButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(accordionButton);
    expect(accordionButton).toHaveAttribute('aria-expanded', 'false');
    // The button belongs to the header, so it stays reachable while the section is closed.
    expect(getByTestId('datasetWizardAddField')).toBeInTheDocument();

    fireEvent.click(getByTestId('datasetWizardAddField'));

    await waitFor(() => {
      expect(accordionButton).toHaveAttribute('aria-expanded', 'true');
      expect(getByTestId('createFieldForm')).toBeInTheDocument();
    });
  });

  it('hides Add field while the create field form is open', async () => {
    const { getByTestId, queryByTestId } = render(<TestHarness />);

    expect(getByTestId('datasetWizardAddField')).toBeInTheDocument();

    fireEvent.click(getByTestId('datasetWizardAddField'));

    await waitFor(() => {
      expect(getByTestId('createFieldForm')).toBeInTheDocument();
      expect(getByTestId('datasetWizardAddField')).toHaveAttribute('aria-hidden', 'true');
    });

    fireEvent.click(getByTestId('fakeConfirmAddField'));

    await waitFor(() => {
      expect(queryByTestId('createFieldForm')).toBeNull();
      expect(getByTestId('datasetWizardAddField')).not.toHaveAttribute('aria-hidden', 'true');
      expect(getByTestId('automaticFieldTypesValue')).toHaveTextContent(
        JSON.stringify({ manual_field: 'keyword' })
      );
    });
  });

  it('orders timestamp mapping, schema mode cards, then field mappings in flow 3 9.6', () => {
    const { getByTestId } = render(
      <TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} />
    );

    const timestampSection = getByTestId('datasetWizardTimestampMappingSection');
    const schemaModeCards = getByTestId('datasetWizardSchemaInferenceModeCards');
    const fieldMappingsTitle = getByTestId('datasetWizardFieldMappingsSectionTitle');

    const timestampSchemaModeDivider = getByTestId('datasetWizardTimestampSchemaModeDivider');

    expect(
      timestampSection.compareDocumentPosition(timestampSchemaModeDivider) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      timestampSchemaModeDivider.compareDocumentPosition(schemaModeCards) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      schemaModeCards.compareDocumentPosition(fieldMappingsTitle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('renders schema inference mode cards instead of the mapped fields accordion in flow 3 9.6', async () => {
    const { getByRole, getByTestId, queryByTestId, queryByText } = render(
      <TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} />
    );

    expect(getByTestId('datasetWizardSchemaInferenceModeCards')).toBeInTheDocument();
    expect(getByRole('radio', { name: /Infer schema/i })).toBeChecked();
    expect(getByTestId('datasetWizardMappedFields')).toBeInTheDocument();
    expect(queryByTestId('datasetWizardMappedFieldsAccordion')).toBeNull();
    expect(queryByTestId('datasetWizardDynamicFieldsSetting')).toBeNull();
    expect(queryByTestId('datasetWizardDynamicFields')).toBeNull();
    expect(queryByTestId('datasetWizardInferSchema')).toBeNull();
    expect(queryByTestId('datasetWizardDynamicFieldsTable')).toBeNull();
    expect(queryByTestId('fakeMappedFieldsDescription')).toBeNull();
    expect(queryByText(/Define the fields for your indexed documents/i)).toBeNull();
    expect(queryByTestId('datasetWizardFieldMappingsRequiredBadge')).toBeNull();
    expect(getByTestId('datasetWizardFieldMappingsSectionTitle')).toHaveTextContent(
      'Field mappings (optional)'
    );
    expect(getByTestId('datasetWizardFieldMappingsOptionalDescription')).toHaveTextContent(
      "Schema will be inferred at query time for fields you don't map."
    );
    expect(queryByTestId('datasetWizardFieldMappingsRequiredDescription')).toBeNull();

    fireEvent.click(getByRole('radio', { name: /Define schema/i }));

    await waitFor(() => {
      expect(getByRole('radio', { name: /Define schema/i })).toBeChecked();
      expect(getByRole('radio', { name: /Infer schema/i })).not.toBeChecked();
      expect(getByTestId('datasetWizardFieldMappingsSectionTitle')).toHaveTextContent(
        'Field mappings'
      );
      expect(getByTestId('datasetWizardFieldMappingsRequiredBadge')).toHaveTextContent('Required');
      expect(getByTestId('datasetWizardFieldMappingsRequiredDescription')).toHaveTextContent(
        'Map at least one field, unmapped fields will not be inferred at query time, so nothing will be available to query until you add mappings.'
      );
      expect(queryByTestId('datasetWizardFieldMappingsOptionalDescription')).toBeNull();
    });
  });

  it('shows schema resolution under Infer schema advanced settings in flow 3 9.6', async () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} format="parquet" />
    );

    expect(queryByTestId('datasetWizardSettingsSchemaResolution')).toBeNull();

    fireEvent.click(getByRole('button', { name: /Configure schema resolution \(optional\)/i }));

    await waitFor(() => {
      expect(getByTestId('datasetWizardSettingsSchemaResolution')).toBeInTheDocument();
    });

    fireEvent.click(getByRole('radio', { name: /Define schema/i }));

    await waitFor(() => {
      expect(
        within(getByTestId('datasetWizardSettingsSchemaResolution')).getByTestId(
          'comboBoxSearchInput'
        )
      ).toBeDisabled();
    });
  });

  it('toggles timeseries mapping fields in flow 3 9.6', () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} />
    );

    expect(getByTestId('datasetWizardTimestampMappingSectionTitle')).toHaveTextContent(
      'Timeseries data'
    );
    const timeseriesToggle = getByTestId('datasetWizardTimestampMappingEnabled');
    expect(timeseriesToggle).toHaveAttribute('aria-checked', 'true');
    expect(getByTestId('datasetWizardTimestampMappingDescription')).toHaveTextContent(
      'Mapping @timestamp is required so queries and dashboards can filter by time.'
    );
    expect(getByTestId('datasetWizardTimestampMappingFields')).toBeInTheDocument();

    fireEvent.click(timeseriesToggle);

    expect(queryByTestId('datasetWizardTimestampMappingFields')).toBeNull();
    expect(getByTestId('datasetWizardTimestampMappingDescription')).toHaveTextContent(
      'If you have timeseries data, you need to define @timestamp in order to ensure we process your data correctly.'
    );
  });

  it('keeps the create field form collapsed until Add field is clicked in flow 3 9.6', async () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} />
    );

    expect(queryByTestId('createFieldForm')).toBeNull();
    expect(getByTestId('datasetWizardAddField')).not.toHaveAttribute('aria-hidden', 'true');
    expect(getByTestId('datasetWizardTimestampMappingSection')).toBeInTheDocument();
    expect(getByTestId('datasetWizardFieldMappingsSectionTitle')).toHaveTextContent(
      'Field mappings (optional)'
    );

    fireEvent.click(getByTestId('datasetWizardAddField'));

    await waitFor(() => {
      expect(getByTestId('createFieldForm')).toBeInTheDocument();
      expect(getByTestId('datasetWizardAddField')).toHaveAttribute('aria-hidden', 'true');
    });

    fireEvent.click(getByTestId('cancelButton'));

    await waitFor(() => {
      expect(queryByTestId('createFieldForm')).toBeNull();
      expect(getByTestId('datasetWizardAddField')).not.toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('restricts mapped field types in flow 3 9.6', () => {
    const { getByTestId } = render(
      <TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} />
    );

    expect(getByTestId('fakeAllowedRootFieldTypes').textContent).toBe(
      JSON.stringify(DATASET_WIZARD_FLOW_396_MAPPED_FIELD_TYPES)
    );
  });

  it('does not close create field form on outside click in flow 3 9.6', () => {
    const { getByTestId } = render(
      <TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} />
    );

    expect(getByTestId('fakeCloseCreateFieldOnOutsideClick').textContent).toBe('false');
  });

  it('passes inline optional date format labels in flow 3 9.6', () => {
    const { getByTestId } = render(
      <TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} />
    );

    expect(JSON.parse(getByTestId('fakeInlineOptionalDateFormatField').textContent ?? 'null')).toEqual(
      {
        label: 'Format (optional)',
        placeholder: 'Select or enter a format',
        presets: [
          { value: 'ISO-8601', label: 'ISO-8601' },
          { value: 'strict_date_optional_time', label: 'strict_date_optional_time' },
          { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd' },
          { value: 'yyyy-MM-dd HH:mm:ss', label: 'yyyy-MM-dd HH:mm:ss' },
        ],
        defaultPresetValue: 'ISO-8601',
        defaultPresetLiteral: 'ISO-8601',
      }
    );
  });

  it('uses mapped field rename and source copy in flow 3 9.6', () => {
    const { getByTestId } = render(
      <TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} />
    );

    expect(JSON.parse(getByTestId('fakeRenameFieldField').textContent ?? 'null')).toEqual({
      label: 'Field name',
      helpText: 'How this field should be named in queries.',
    });
    expect(JSON.parse(getByTestId('fakeSourceNameField').textContent ?? 'null')).toEqual({
      label: 'Original field name (optional)',
      helpText: 'If field name is different in your files, you can set it up.',
      requiredErrorMessage: 'Enter a path.',
    });
  });
});
