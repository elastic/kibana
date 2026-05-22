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
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiPageSection,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import type { DatasetSummary } from '@kbn/evals-common';
import { useCreateDataset, useDatasets } from '../../hooks/use_evals_api';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
import * as i18n from './translations';

export const DatasetsListPage: React.FC = () => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const { canManage } = useEvalsPermissions();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [isCreateFlyoutOpen, setIsCreateFlyoutOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const createDataset = useCreateDataset();

  const { data, isLoading, error, refetch } = useDatasets({
    page: pageIndex + 1,
    perPage: pageSize,
  });

  const columns: Array<EuiBasicTableColumn<DatasetSummary>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.COLUMN_NAME,
        render: (datasetName: string, item: DatasetSummary) => (
          <EuiLink
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              history.push(`/datasets/${item.id}`);
            }}
          >
            <strong>{datasetName}</strong>
          </EuiLink>
        ),
      },
      {
        field: 'description',
        name: i18n.COLUMN_DESCRIPTION,
        render: (descriptionValue: string) => descriptionValue || '-',
      },
      {
        field: 'examples_count',
        name: i18n.COLUMN_EXAMPLES,
      },
      {
        field: 'updated_at',
        name: i18n.COLUMN_LAST_UPDATED,
        render: (updatedAt: string) => (updatedAt ? new Date(updatedAt).toLocaleString() : '-'),
      },
    ],
    [history]
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

  const openCreateFlyout = () => {
    setName('');
    setDescription('');
    setCreateError(null);
    setIsCreateFlyoutOpen(true);
  };

  const closeCreateFlyout = () => {
    setIsCreateFlyoutOpen(false);
    setCreateError(null);
  };

  const onCreateDataset = async () => {
    if (!name.trim()) {
      setCreateError(i18n.CREATE_DATASET_NAME_REQUIRED_ERROR);
      return;
    }

    try {
      setCreateError(null);
      await createDataset.mutateAsync({
        name: name.trim(),
        description: description.trim(),
      });
      setPageIndex(0);
      closeCreateFlyout();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <>
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        {canManage ? (
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={openCreateFlyout} fill iconType="plusInCircle">
                {i18n.CREATE_DATASET_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
        <EuiSpacer size="m" />
        {error ? (
          <EuiEmptyPrompt
            color="danger"
            iconType="warning"
            title={<h2>{i18n.LOAD_ERROR_TITLE}</h2>}
            body={<p>{i18n.getLoadErrorBody(String(error))}</p>}
            actions={[
              <EuiButton onClick={() => refetch()} iconType="refresh">
                {i18n.RETRY_BUTTON}
              </EuiButton>,
            ]}
          />
        ) : (
          <EuiBasicTable<DatasetSummary>
            tableCaption={i18n.TABLE_CAPTION}
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
        )}
      </EuiPageSection>
      {isCreateFlyoutOpen ? (
        <EuiFlyout onClose={closeCreateFlyout} size="s" aria-labelledby="createDatasetFlyoutTitle">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id="createDatasetFlyoutTitle">{i18n.CREATE_DATASET_FLYOUT_TITLE}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiForm component="form">
              <EuiFormRow
                label={i18n.CREATE_DATASET_NAME_LABEL}
                isInvalid={Boolean(createError)}
                error={createError ?? undefined}
              >
                <EuiFieldText
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  isInvalid={Boolean(createError)}
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.CREATE_DATASET_DESCRIPTION_LABEL}>
                <EuiFieldText
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={closeCreateFlyout}>
                  {i18n.CREATE_DATASET_CANCEL_BUTTON}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={onCreateDataset}
                  fill
                  isLoading={createDataset.isLoading}
                  disabled={createDataset.isLoading}
                >
                  {i18n.CREATE_DATASET_SUBMIT_BUTTON}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      ) : null}
    </>
  );
};
