/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiBasicTableColumn, EuiComboBox, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import euiStyled from '../../../../../../../../common/eui_styled_components';
import { LogEntryCategory } from '../../../../../../common/http_api/log_analysis';
import { RegularExpressionRepresentation } from './category_expression';
import { DatasetsList } from './datasets_list';

export const TopCategoriesTable = euiStyled(
  ({ topCategories, className }: { className?: string; topCategories: LogEntryCategory[] }) => {
    return (
      <>
        <EuiComboBox placeholder={datasetFilterPlaceholder} />
        <EuiSpacer />
        <EuiBasicTable
          columns={columns}
          items={topCategories}
          rowProps={{ className: `${className} euiTableRow--topAligned` }}
        />
      </>
    );
  }
)`
  &.euiTableRow--topAligned .euiTableRowCell {
    vertical-align: top;
  }
`;

const columns: Array<EuiBasicTableColumn<LogEntryCategory>> = [
  {
    field: 'logEntryCount',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.countColumnTitle', {
      defaultMessage: 'Message count',
    }),
    width: '200px',
  },
  {
    field: 'regularExpression',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.categoryColumnTitle', {
      defaultMessage: 'Category',
    }),
    truncateText: true,
    render: (regularExpression: string) => (
      <RegularExpressionRepresentation regularExpression={regularExpression} />
    ),
  },
  {
    field: 'datasets',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.datasetColumnTitle', {
      defaultMessage: 'Data sets',
    }),
    render: (datasets: string[]) => <DatasetsList datasets={datasets} />,
    width: '200px',
  },
  {
    field: 'maximumAnomalyScore',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.maximumAnomalyScoreColumnTitle', {
      defaultMessage: 'Maximum anomaly score',
    }),
    width: '200px',
  },
];

const datasetFilterPlaceholder = i18n.translate(
  'xpack.infra.logs.logEntryCategories.datasetFilterPlaceholder',
  {
    defaultMessage: 'Select data sets',
  }
);
