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
import type { TestConfigurationPreviewField } from '../test_configuration_preview_utils';
import { InferredSchemaMappingsEditor } from './inferred_schema_mappings_editor';

const FakeMappedFieldsEditor: FunctionComponent<MappedFieldsEditorProps> = ({
  value,
  onChange,
}) => {
  const [mappings, setMappings] = useState(value ?? {});
  const [isCreateFieldFormOpen, setIsCreateFieldFormOpen] = useState(false);

  const addManualField = () => {
    setIsCreateFieldFormOpen(true);
  };

  const confirmManualField = () => {
    const nextMappings = {
      properties: {
        ...((mappings as { properties?: Record<string, unknown> }).properties ?? {}),
        manual_field: { type: 'keyword' },
      },
    };
    setMappings(nextMappings);
    setIsCreateFieldFormOpen(false);
    onChange({
      getData: () => nextMappings,
      validate: () => Promise.resolve(true),
      isValid: true,
    });
  };

  return (
    <div>
      <div data-test-subj="fakeMappedFieldsValue">{JSON.stringify(mappings)}</div>
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
}: {
  automaticFieldTypes?: Record<string, string>;
}) => {
  const { control, watch } = useForm<DatasetWizardFormValues>({
    defaultValues: {
      ...emptyDatasetWizardFormValues(),
      automatic_field_types: automaticFieldTypes,
    },
  });

  return (
    <EuiProvider>
      <InferredSchemaMappingsEditor control={control} inferredFields={inferredFields} />
      <span data-test-subj="automaticFieldTypesValue">
        {JSON.stringify(watch('automatic_field_types'))}
      </span>
    </EuiProvider>
  );
};

describe('InferredSchemaMappingsEditor', () => {
  it('renders the mapped fields editor with an Infer schema split button', () => {
    const { getByTestId, queryByTestId } = render(<TestHarness />);

    expect(getByTestId('datasetWizardInferredSchemaMappingsEditor')).toBeInTheDocument();
    expect(getByTestId('datasetWizardAddField')).toBeInTheDocument();
    expect(getByTestId('datasetWizardInferSchemaSplitButton')).toBeInTheDocument();
    expect(getByTestId('datasetWizardInferSchema')).toBeInTheDocument();
    expect(getByTestId('datasetWizardInferSchemaMenuButton')).toBeInTheDocument();
    expect(queryByTestId('datasetWizardInferMissingFields')).toBeNull();
  });

  it('replaces all fields with the inferred schema when Infer schema is clicked', async () => {
    const { getByTestId } = render(
      <TestHarness automaticFieldTypes={{ manual_field: 'keyword' }} />
    );

    fireEvent.click(getByTestId('datasetWizardInferSchema'));

    await waitFor(() => {
      expect(getByTestId('automaticFieldTypesValue')).toHaveTextContent(
        JSON.stringify({ '@timestamp': 'date', message: 'text' })
      );
    });
  });

  it('only adds missing inferred fields when Infer missing fields is clicked, preserving manual edits', async () => {
    const { getByTestId } = render(<TestHarness automaticFieldTypes={{ message: 'keyword' }} />);

    fireEvent.click(getByTestId('datasetWizardInferSchemaMenuButton'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardInferMissingFields')).toBeInTheDocument();
    });

    fireEvent.click(getByTestId('datasetWizardInferMissingFields'));

    await waitFor(() => {
      expect(getByTestId('automaticFieldTypesValue')).toHaveTextContent(
        JSON.stringify({ message: 'keyword', '@timestamp': 'date' })
      );
    });
  });

  it('disables Infer missing fields until a field is present', async () => {
    const { getByTestId, queryByTestId } = render(<TestHarness />);

    fireEvent.click(getByTestId('datasetWizardInferSchemaMenuButton'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardInferMissingFields')).toBeDisabled();
    });

    fireEvent.click(getByTestId('datasetWizardInferSchemaMenuButton'));

    await waitFor(() => {
      expect(queryByTestId('datasetWizardInferMissingFields')).toBeNull();
    });

    fireEvent.click(getByTestId('datasetWizardAddField'));
    fireEvent.click(getByTestId('fakeConfirmAddField'));
    fireEvent.click(getByTestId('datasetWizardInferSchemaMenuButton'));

    await waitFor(() => {
      expect(getByTestId('datasetWizardInferMissingFields')).toBeEnabled();
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
    });
  });
});
