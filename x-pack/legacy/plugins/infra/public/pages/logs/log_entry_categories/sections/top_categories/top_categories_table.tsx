/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiComboBox, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const TopCategoriesTable: React.FunctionComponent = () => {
  return (
    <>
      <EuiComboBox placeholder={datasetFilterPlaceholder} />
      <EuiSpacer />
      <EuiBasicTable columns={columns} items={items} />
    </>
  );
};

const columns = [
  {
    field: 'count',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.countColumnTitle', {
      defaultMessage: 'Message count',
    }),
    render: () => 'count',
  },
  {
    field: 'category',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.categoryColumnTitle', {
      defaultMessage: 'Category',
    }),
  },
  {
    field: 'dataset',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.datasetColumnTitle', {
      defaultMessage: 'Data set',
    }),
  },
  {
    field: 'maximumAnomalyScore',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.maximumAnomalyScoreColumnTitle', {
      defaultMessage: 'Maximum anomaly score',
    }),
  },
];

const items: any[] = [];

const datasetFilterPlaceholder = i18n.translate(
  'xpack.infra.logs.logEntryCategories.datasetFilterPlaceholder',
  {
    defaultMessage: 'Select data sets',
  }
);
