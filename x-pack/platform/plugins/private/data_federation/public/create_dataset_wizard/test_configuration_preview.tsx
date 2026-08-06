/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { datasetWizardStrings } from './dataset_wizard_i18n';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import {
  buildTestConfigurationPreviewRows,
  getTestConfigurationPreviewFields,
  TEST_CONFIGURATION_PREVIEW_ROW_COUNT,
  type TestConfigurationPreviewRow,
} from './test_configuration_preview_utils';
import { SchemaSamplePreviewTable } from './schema_sample_preview_table';

export interface TestConfigurationPreviewProps {
  values: DatasetWizardFormValues;
  isLoading: boolean;
  onClose: () => void;
}

export interface TestConfigurationPreviewContentProps {
  values: DatasetWizardFormValues;
  isLoading?: boolean;
  testSubjPrefix?: string;
  maxVisibleRows?: number;
}

const FLOW_1_VISIBLE_DATA_ROWS = 4.5;

export const TestConfigurationPreview: FunctionComponent<TestConfigurationPreviewProps> = ({
  values,
  isLoading,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const fields = useMemo(() => getTestConfigurationPreviewFields(values), [values]);
  const tableScrollContainerStyles = useMemo(
    () => css`
      max-height: calc(${euiTheme.size.l} + (${FLOW_1_VISIBLE_DATA_ROWS} * ${euiTheme.size.xxxl}));
      overflow: auto;

      .euiTable {
        min-width: max(100%, ${fields.length * 140}px);
      }
    `,
    [euiTheme.size.l, euiTheme.size.xxxl, fields.length]
  );
  const items = useMemo(() => buildTestConfigurationPreviewRows(fields), [fields]);

  const columns = useMemo<Array<EuiBasicTableColumn<TestConfigurationPreviewRow>>>(
    () =>
      fields.map((field) => ({
        field: field.name,
        name: field.name,
        truncateText: true,
        'data-test-subj': `datasetWizardTestConfigurationColumn-${field.name}`,
      })),
    [fields]
  );

  return (
    <EuiPanel hasBorder hasShadow={false} data-test-subj="datasetWizardTestConfigurationPreview">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{datasetWizardStrings.testConfigurationPreviewTitle()}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            aria-label={datasetWizardStrings.testConfigurationPreviewCloseAriaLabel()}
            data-test-subj="datasetWizardTestConfigurationClose"
            onClick={onClose}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>{datasetWizardStrings.testConfigurationPreviewDescription()}</p>
      </EuiText>
      <EuiSpacer size="m" />

      {isLoading ? (
        <EuiFlexGroup justifyContent="center" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" data-test-subj="datasetWizardTestConfigurationLoading" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <div
          css={tableScrollContainerStyles}
          data-test-subj="datasetWizardTestConfigurationTableScroll"
        >
          <EuiInMemoryTable<TestConfigurationPreviewRow>
            items={items}
            itemId="id"
            columns={columns}
            pagination={false}
            tableLayout="auto"
            responsiveBreakpoint={false}
            data-test-subj="datasetWizardTestConfigurationTable"
            tableCaption={datasetWizardStrings.testConfigurationPreviewTableCaption(
              TEST_CONFIGURATION_PREVIEW_ROW_COUNT
            )}
          />
        </div>
      )}
    </EuiPanel>
  );
};

export const TestConfigurationPreviewContent: FunctionComponent<
  TestConfigurationPreviewContentProps
> = ({
  values,
  isLoading = false,
  testSubjPrefix = 'datasetWizardTestConfiguration',
  maxVisibleRows,
}) => {
  const fields = useMemo(() => getTestConfigurationPreviewFields(values), [values]);

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" data-test-subj="datasetWizardTestConfigurationLoading" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <SchemaSamplePreviewTable
      fields={fields}
      testSubjPrefix={testSubjPrefix}
      maxVisibleRows={maxVisibleRows}
    />
  );
};
