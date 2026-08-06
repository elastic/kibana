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
import type { UseEuiTheme } from '@elastic/eui';
import { EuiInMemoryTable, useEuiTheme } from '@elastic/eui';

import { datasetWizardStrings } from './dataset_wizard_i18n';
import {
  buildTestConfigurationPreviewRows,
  TEST_CONFIGURATION_PREVIEW_ROW_COUNT,
  type TestConfigurationPreviewField,
  type TestConfigurationPreviewRow,
} from './test_configuration_preview_utils';

const VISIBLE_DATA_ROWS = 4.5;

export const getSchemaSamplePreviewTableHeight = (
  euiTheme: UseEuiTheme['euiTheme'],
  visibleRows: number
): string => `calc(${euiTheme.size.l} + (${visibleRows} * ${euiTheme.size.xxxl}))`;

export interface SchemaSamplePreviewTableProps {
  fields: TestConfigurationPreviewField[];
  rowCount?: number;
  testSubjPrefix: string;
  maxVisibleRows?: number;
}

export const SchemaSamplePreviewTable: FunctionComponent<SchemaSamplePreviewTableProps> = ({
  fields,
  rowCount = TEST_CONFIGURATION_PREVIEW_ROW_COUNT,
  testSubjPrefix,
  maxVisibleRows = VISIBLE_DATA_ROWS,
}) => {
  const { euiTheme } = useEuiTheme();
  const tableScrollContainerStyles = useMemo(
    () => css`
      max-height: ${getSchemaSamplePreviewTableHeight(euiTheme, maxVisibleRows)};
      overflow: auto;

      .euiTable {
        min-width: max(100%, ${fields.length * 140}px);
      }
    `,
    [euiTheme, fields.length, maxVisibleRows]
  );
  const items = useMemo(() => buildTestConfigurationPreviewRows(fields, rowCount), [fields, rowCount]);

  const columns = useMemo<Array<EuiBasicTableColumn<TestConfigurationPreviewRow>>>(
    () =>
      fields.map((field) => ({
        field: field.name,
        name: field.name,
        truncateText: true,
        'data-test-subj': `${testSubjPrefix}Column-${field.name}`,
      })),
    [fields, testSubjPrefix]
  );

  return (
    <div css={tableScrollContainerStyles} data-test-subj={`${testSubjPrefix}TableScroll`}>
      <EuiInMemoryTable<TestConfigurationPreviewRow>
        items={items}
        itemId="id"
        columns={columns}
        pagination={false}
        tableLayout="auto"
        responsiveBreakpoint={false}
        data-test-subj={`${testSubjPrefix}Table`}
        tableCaption={datasetWizardStrings.testConfigurationPreviewTableCaption(rowCount)}
      />
    </div>
  );
};
