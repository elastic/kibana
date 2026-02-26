/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiConfirmModal,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import type { DatasetExample, EvaluationRunSummary } from '@kbn/evals-common';
import {
  useAddExamples,
  useDataset,
  useDeleteExample,
  useEvaluationRuns,
  useUpdateDataset,
  useUpdateExample,
} from '../../hooks/use_evals_api';
import * as i18n from './translations';

type JsonObject = Record<string, unknown>;

type ExampleEditorState =
  | { mode: 'create'; input: string; output: string; metadata: string }
  | { mode: 'edit'; example: DatasetExample; input: string; output: string; metadata: string };

const prettyJson = (value: unknown) => JSON.stringify(value, null, 2);

const parseJsonObject = (value: string, fieldLabel: string): JsonObject => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${fieldLabel} must be a JSON object.`);
    }
    return parsed as JsonObject;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${i18n.JSON_PARSE_ERROR_PREFIX} ${message}`);
  }
};

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : '-');

export const DatasetDetailPage: React.FC = () => {
  const { datasetId } = useParams<{ datasetId: string }>();
  const history = useHistory();

  const { data: dataset, isLoading: isDatasetLoading, error: datasetError } = useDataset(datasetId);
  const {
    data: runsData,
    isLoading: isRunsLoading,
    error: runsError,
  } = useEvaluationRuns({
    datasetId,
    page: 1,
    perPage: 100,
  });

  const updateDataset = useUpdateDataset();
  const addExamples = useAddExamples();
  const updateExample = useUpdateExample();
  const deleteExample = useDeleteExample();

  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [metadataName, setMetadataName] = useState('');
  const [metadataDescription, setMetadataDescription] = useState('');
  const [exampleEditor, setExampleEditor] = useState<ExampleEditorState | null>(null);
  const [deletingExample, setDeletingExample] = useState<DatasetExample | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const openMetadataModal = () => {
    setMetadataName(dataset?.name ?? '');
    setMetadataDescription(dataset?.description ?? '');
    setFormError(null);
    setIsMetadataModalOpen(true);
  };

  const openCreateExampleModal = () => {
    setFormError(null);
    setExampleEditor({
      mode: 'create',
      input: '{}',
      output: '{}',
      metadata: '{}',
    });
  };

  const openEditExampleModal = (example: DatasetExample) => {
    setFormError(null);
    setExampleEditor({
      mode: 'edit',
      example,
      input: prettyJson(example.input),
      output: prettyJson(example.output),
      metadata: prettyJson(example.metadata),
    });
  };

  const closeModals = () => {
    setIsMetadataModalOpen(false);
    setExampleEditor(null);
    setDeletingExample(null);
    setFormError(null);
  };

  const onSubmitMetadata = async () => {
    if (!dataset) {
      return;
    }
    try {
      setFormError(null);
      await updateDataset.mutateAsync({
        datasetId: dataset.id,
        updates: {
          name: metadataName,
          description: metadataDescription,
        },
      });
      setIsMetadataModalOpen(false);
    } catch (error) {
      setFormError(String(error));
    }
  };

  const onSubmitExample = async () => {
    if (!exampleEditor) {
      return;
    }

    try {
      setFormError(null);
      const input = parseJsonObject(exampleEditor.input, i18n.JSON_INPUT_LABEL);
      const output = parseJsonObject(exampleEditor.output, i18n.JSON_OUTPUT_LABEL);
      const metadata = parseJsonObject(exampleEditor.metadata, i18n.JSON_METADATA_LABEL);

      if (exampleEditor.mode === 'create') {
        await addExamples.mutateAsync({
          datasetId,
          body: {
            examples: [{ input, output, metadata }],
          },
        });
      } else {
        await updateExample.mutateAsync({
          datasetId,
          exampleId: exampleEditor.example.id,
          updates: {
            input,
            output,
            metadata,
          },
        });
      }
      setExampleEditor(null);
    } catch (error) {
      setFormError(String(error));
    }
  };

  const onDeleteExample = async () => {
    if (!deletingExample) {
      return;
    }
    try {
      setFormError(null);
      await deleteExample.mutateAsync({
        datasetId,
        exampleId: deletingExample.id,
      });
      setDeletingExample(null);
    } catch (error) {
      setFormError(String(error));
    }
  };

  const examplesColumns: Array<EuiBasicTableColumn<DatasetExample>> = useMemo(
    () => [
      {
        field: 'id',
        name: i18n.COLUMN_EXAMPLE_ID,
        width: '180px',
        render: (value: string) => `${value.slice(0, 10)}...`,
      },
      {
        field: 'input',
        name: i18n.COLUMN_INPUT,
        render: (value: unknown) => (
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
            {prettyJson(value)}
          </EuiCodeBlock>
        ),
      },
      {
        field: 'output',
        name: i18n.COLUMN_OUTPUT,
        render: (value: unknown) => (
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
            {prettyJson(value)}
          </EuiCodeBlock>
        ),
      },
      {
        field: 'metadata',
        name: i18n.COLUMN_METADATA,
        render: (value: unknown) => (
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
            {prettyJson(value)}
          </EuiCodeBlock>
        ),
      },
      {
        field: 'updated_at',
        name: i18n.COLUMN_UPDATED_AT,
        width: '180px',
        render: (value: string) => formatDate(value),
      },
      {
        name: i18n.COLUMN_ACTIONS,
        width: '86px',
        actions: [
          {
            name: i18n.EDIT_EXAMPLE_ACTION,
            description: i18n.EDIT_EXAMPLE_ACTION,
            icon: 'pencil',
            type: 'icon',
            onClick: (example: DatasetExample) => openEditExampleModal(example),
          },
          {
            name: i18n.DELETE_EXAMPLE_ACTION,
            description: i18n.DELETE_EXAMPLE_ACTION,
            icon: 'trash',
            type: 'icon',
            color: 'danger',
            onClick: (example: DatasetExample) => setDeletingExample(example),
          },
        ],
      },
    ],
    []
  );

  const runsColumns: Array<EuiBasicTableColumn<EvaluationRunSummary>> = useMemo(
    () => [
      {
        field: 'run_id',
        name: i18n.COLUMN_RUN_ID,
        render: (runId: string) => (
          <EuiLink
            onClick={() =>
              history.push(`/runs/${runId}?dataset_id=${encodeURIComponent(datasetId)}`)
            }
          >
            {runId.slice(0, 12)}...
          </EuiLink>
        ),
      },
      {
        field: 'timestamp',
        name: i18n.COLUMN_RUN_TIMESTAMP,
        render: (timestamp: string) => formatDate(timestamp),
      },
      {
        field: 'suite_id',
        name: i18n.COLUMN_RUN_SUITE,
        render: (value?: string) => value ?? '-',
      },
      {
        field: 'task_model',
        name: i18n.COLUMN_RUN_TASK_MODEL,
        render: (value: EvaluationRunSummary['task_model']) => value?.id ?? '-',
      },
      {
        field: 'evaluator_model',
        name: i18n.COLUMN_RUN_EVALUATOR_MODEL,
        render: (value: EvaluationRunSummary['evaluator_model']) => value?.id ?? '-',
      },
    ],
    [datasetId, history]
  );

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        pageTitle={i18n.getPageTitle(dataset?.name ?? datasetId)}
        breadcrumbs={[
          { text: i18n.BREADCRUMB_EVALUATIONS, onClick: () => history.push('/') },
          { text: i18n.BREADCRUMB_DATASETS, onClick: () => history.push('/datasets') },
          { text: dataset?.name ?? datasetId },
        ]}
      />
      <EuiPageTemplate.Section>
        {datasetError ? (
          <EuiText color="danger" size="s">
            <p>{String(datasetError)}</p>
          </EuiText>
        ) : null}
        {runsError ? (
          <EuiText color="danger" size="s">
            <p>{String(runsError)}</p>
          </EuiText>
        ) : null}

        {isDatasetLoading ? (
          <EuiLoadingSpinner size="xl" />
        ) : (
          <>
            {formError ? (
              <>
                <EuiText color="danger" size="s">
                  <p>{formError}</p>
                </EuiText>
                <EuiSpacer size="m" />
              </>
            ) : null}

            {dataset ? (
              <>
                <EuiTitle size="s">
                  <h3>{i18n.METADATA_SECTION_TITLE}</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiPanel hasBorder hasShadow={false}>
                  <EuiFlexGroup alignItems="flexStart">
                    <EuiFlexItem>
                      <EuiText size="s">
                        <p>
                          <strong>{i18n.METADATA_NAME_LABEL}</strong>: {dataset.name}
                        </p>
                        <p>
                          <strong>{i18n.METADATA_DESCRIPTION_LABEL}</strong>:{' '}
                          {dataset.description || '-'}
                        </p>
                        <p>
                          <strong>{i18n.METADATA_CREATED_AT_LABEL}</strong>:{' '}
                          {formatDate(dataset.created_at)}
                        </p>
                        <p>
                          <strong>{i18n.METADATA_UPDATED_AT_LABEL}</strong>:{' '}
                          {formatDate(dataset.updated_at)}
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButton iconType="pencil" onClick={openMetadataModal}>
                        {i18n.EDIT_METADATA_BUTTON}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>

                <EuiSpacer size="l" />
                <EuiTitle size="s">
                  <h3>{i18n.EXAMPLES_SECTION_TITLE}</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButton iconType="plusInCircle" onClick={openCreateExampleModal}>
                      {i18n.ADD_EXAMPLE_BUTTON}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiBasicTable<DatasetExample>
                  items={dataset.examples}
                  columns={examplesColumns}
                  loading={
                    addExamples.isLoading || updateExample.isLoading || deleteExample.isLoading
                  }
                  noItemsMessage={i18n.EXAMPLES_EMPTY_MESSAGE}
                />

                <EuiSpacer size="l" />
                <EuiHorizontalRule />
                <EuiSpacer size="l" />

                <EuiTitle size="s">
                  <h3>{i18n.RUNS_SECTION_TITLE}</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiBasicTable<EvaluationRunSummary>
                  items={runsData?.runs ?? []}
                  columns={runsColumns}
                  loading={isRunsLoading}
                  noItemsMessage={i18n.RUNS_EMPTY_MESSAGE}
                />
              </>
            ) : null}
          </>
        )}
      </EuiPageTemplate.Section>

      {isMetadataModalOpen ? (
        <EuiModal onClose={closeModals}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{i18n.EDIT_METADATA_MODAL_TITLE}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiForm component="form">
              <EuiFormRow label={i18n.METADATA_NAME_LABEL}>
                <EuiFieldText
                  value={metadataName}
                  onChange={(event) => setMetadataName(event.target.value)}
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.METADATA_DESCRIPTION_LABEL}>
                <EuiTextArea
                  value={metadataDescription}
                  onChange={(event) => setMetadataDescription(event.target.value)}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModals}>{i18n.MODAL_CANCEL_BUTTON}</EuiButtonEmpty>
            <EuiButton onClick={onSubmitMetadata} fill isLoading={updateDataset.isLoading}>
              {i18n.MODAL_SAVE_BUTTON}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      ) : null}

      {exampleEditor ? (
        <EuiModal onClose={closeModals}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              {exampleEditor.mode === 'create'
                ? i18n.ADD_EXAMPLE_MODAL_TITLE
                : i18n.EDIT_EXAMPLE_MODAL_TITLE}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiForm component="form">
              <EuiFormRow label={i18n.JSON_INPUT_LABEL}>
                <EuiTextArea
                  rows={5}
                  value={exampleEditor.input}
                  onChange={(event) =>
                    setExampleEditor((prev) =>
                      prev ? { ...prev, input: event.target.value } : prev
                    )
                  }
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.JSON_OUTPUT_LABEL}>
                <EuiTextArea
                  rows={5}
                  value={exampleEditor.output}
                  onChange={(event) =>
                    setExampleEditor((prev) =>
                      prev ? { ...prev, output: event.target.value } : prev
                    )
                  }
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.JSON_METADATA_LABEL}>
                <EuiTextArea
                  rows={5}
                  value={exampleEditor.metadata}
                  onChange={(event) =>
                    setExampleEditor((prev) =>
                      prev ? { ...prev, metadata: event.target.value } : prev
                    )
                  }
                />
              </EuiFormRow>
            </EuiForm>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModals}>{i18n.MODAL_CANCEL_BUTTON}</EuiButtonEmpty>
            <EuiButton
              onClick={onSubmitExample}
              fill
              isLoading={addExamples.isLoading || updateExample.isLoading}
            >
              {i18n.MODAL_SAVE_BUTTON}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      ) : null}

      {deletingExample ? (
        <EuiConfirmModal
          title={i18n.CONFIRM_DELETE_EXAMPLE_TITLE}
          onCancel={closeModals}
          onConfirm={onDeleteExample}
          cancelButtonText={i18n.MODAL_CANCEL_BUTTON}
          confirmButtonText={i18n.MODAL_DELETE_BUTTON}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>{i18n.CONFIRM_DELETE_EXAMPLE_BODY}</p>
        </EuiConfirmModal>
      ) : null}
    </EuiPageTemplate>
  );
};
