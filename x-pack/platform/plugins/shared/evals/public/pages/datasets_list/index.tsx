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
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPageTemplate,
  EuiSpacer,
  EuiTextArea,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import type { DatasetSummary } from '@kbn/evals-common';
import { useCreateDataset, useDatasets } from '../../hooks/use_evals_api';
import * as i18n from './translations';

type JsonObject = Record<string, unknown>;

const parseJsonObject = (
  value: unknown,
  fieldName: string,
  index: number,
  examplesLabel: string
): JsonObject => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(
      i18n.CREATE_DATASET_EXAMPLES_FIELD_OBJECT_ERROR(index + 1, fieldName, examplesLabel)
    );
  }

  return value as JsonObject;
};

const parseExamplesInput = (
  value: string
): Array<{ input: JsonObject; output: JsonObject; metadata: JsonObject }> => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(i18n.CREATE_DATASET_EXAMPLES_PARSE_ERROR(message));
  }

  if (!Array.isArray(parsed)) {
    throw new Error(i18n.CREATE_DATASET_EXAMPLES_ARRAY_ERROR);
  }

  return parsed.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new Error(i18n.CREATE_DATASET_EXAMPLES_ITEM_OBJECT_ERROR(index + 1));
    }

    const valueAsObject = entry as Record<string, unknown>;

    return {
      input: parseJsonObject(
        valueAsObject.input,
        'input',
        index,
        i18n.CREATE_DATASET_EXAMPLES_LABEL
      ),
      output: parseJsonObject(
        valueAsObject.output,
        'output',
        index,
        i18n.CREATE_DATASET_EXAMPLES_LABEL
      ),
      metadata: parseJsonObject(
        valueAsObject.metadata,
        'metadata',
        index,
        i18n.CREATE_DATASET_EXAMPLES_LABEL
      ),
    };
  });
};

export const DatasetsListPage: React.FC = () => {
  const history = useHistory();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [examplesInput, setExamplesInput] = useState('[]');
  const [createError, setCreateError] = useState<string | null>(null);

  const createDataset = useCreateDataset();

  const { data, isLoading } = useDatasets({
    page: pageIndex + 1,
    perPage: pageSize,
  });

  const columns: Array<EuiBasicTableColumn<DatasetSummary>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.COLUMN_NAME,
        sortable: true,
      },
      {
        field: 'description',
        name: i18n.COLUMN_DESCRIPTION,
        render: (descriptionValue: string) => descriptionValue || '-',
      },
      {
        field: 'examples_count',
        name: i18n.COLUMN_EXAMPLES,
        sortable: true,
      },
      {
        field: 'updated_at',
        name: i18n.COLUMN_LAST_UPDATED,
        sortable: true,
        render: (updatedAt: string) => (updatedAt ? new Date(updatedAt).toLocaleString() : '-'),
      },
    ],
    []
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 25, 50],
  };

  const onTableChange = ({ page }: CriteriaWithPagination<DatasetSummary>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const openCreateModal = () => {
    setName('');
    setDescription('');
    setExamplesInput('[]');
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateError(null);
  };

  const onCreateDataset = async () => {
    if (!name.trim()) {
      setCreateError(i18n.CREATE_DATASET_NAME_REQUIRED_ERROR);
      return;
    }

    try {
      setCreateError(null);
      const examples = parseExamplesInput(examplesInput);
      await createDataset.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        examples,
      });
      setPageIndex(0);
      closeCreateModal();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        pageTitle={i18n.PAGE_TITLE}
        rightSideItems={[
          <EuiButton onClick={openCreateModal} fill>
            {i18n.CREATE_DATASET_BUTTON}
          </EuiButton>,
        ]}
      />
      <EuiPageTemplate.Section>
        <EuiBasicTable<DatasetSummary>
          items={data?.datasets ?? []}
          columns={columns}
          loading={isLoading}
          pagination={pagination}
          onChange={onTableChange}
          rowProps={(item) => ({
            onClick: () => history.push(`/datasets/${item.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </EuiPageTemplate.Section>
      {isCreateModalOpen ? (
        <EuiModal onClose={closeCreateModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{i18n.CREATE_DATASET_MODAL_TITLE}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiForm component="form">
              <EuiFormRow
                label={i18n.CREATE_DATASET_NAME_LABEL}
                isInvalid={Boolean(createError && !name.trim())}
                error={createError && !name.trim() ? createError : undefined}
              >
                <EuiFieldText
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  isInvalid={Boolean(createError && !name.trim())}
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.CREATE_DATASET_DESCRIPTION_LABEL}>
                <EuiFieldText
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.CREATE_DATASET_EXAMPLES_LABEL}
                helpText={i18n.CREATE_DATASET_EXAMPLES_HELP_TEXT}
                isInvalid={Boolean(createError && name.trim())}
                error={createError && name.trim() ? createError : undefined}
              >
                <EuiTextArea
                  value={examplesInput}
                  onChange={(event) => setExamplesInput(event.target.value)}
                  rows={12}
                  isInvalid={Boolean(createError && name.trim())}
                />
              </EuiFormRow>
              <EuiSpacer size="s" />
            </EuiForm>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton onClick={closeCreateModal} color="text">
              {i18n.CREATE_DATASET_CANCEL_BUTTON}
            </EuiButton>
            <EuiButton
              onClick={onCreateDataset}
              fill
              isLoading={createDataset.isLoading}
              disabled={createDataset.isLoading}
            >
              {i18n.CREATE_DATASET_SUBMIT_BUTTON}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      ) : null}
    </EuiPageTemplate>
  );
};
