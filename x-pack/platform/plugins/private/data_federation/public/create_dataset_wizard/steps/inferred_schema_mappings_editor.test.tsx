/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import type { MappedFieldsEditorProps } from '@kbn/index-management-shared-types';

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
}) => {
  const [mappings, setMappings] = useState(value ?? {});
  const [isCreateFieldFormOpen, setIsCreateFieldFormOpen] = useState(false);

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
          <button type="button" data-test-subj="fakeConfirmAddField" onClick={confirmManualField}>
            Confirm field
          </button>
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
}: {
  automaticFieldTypes?: Record<string, string>;
  flowVariant?: DatasetWizardFlowVariant;
}) => {
  const { control, watch } = useForm<DatasetWizardFormValues>({
    defaultValues: {
      ...emptyDatasetWizardFormValues(),
      automatic_field_types: automaticFieldTypes,
    },
  });

  return (
    <EuiProvider>
      <InferredSchemaMappingsEditor
        control={control}
        flowVariant={flowVariant}
        inferredFields={inferredFields}
      />
      <span data-test-subj="automaticFieldTypesValue">
        {JSON.stringify(watch('automatic_field_types'))}
      </span>
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
      expect(queryByTestId('datasetWizardAddField')).toBeNull();
    });

    fireEvent.click(getByTestId('fakeConfirmAddField'));

    await waitFor(() => {
      expect(queryByTestId('createFieldForm')).toBeNull();
      expect(getByTestId('datasetWizardAddField')).toBeInTheDocument();
      expect(getByTestId('automaticFieldTypesValue')).toHaveTextContent(
        JSON.stringify({ manual_field: 'keyword' })
      );
    });
  });

  it('leaves the dynamic fields section to the schema settings in flow 3 9.6', () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6} />
    );

    expect(getByTestId('datasetWizardMappedFields')).toBeInTheDocument();
    expect(queryByTestId('datasetWizardDynamicFields')).toBeNull();
    expect(queryByTestId('datasetWizardDynamicFieldsEnabled')).toBeNull();
    expect(queryByTestId('datasetWizardInferSchema')).toBeNull();
    expect(queryByTestId('datasetWizardDynamicFieldsTable')).toBeNull();
  });
});
