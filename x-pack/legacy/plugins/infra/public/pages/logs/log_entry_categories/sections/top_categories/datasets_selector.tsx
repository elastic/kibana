/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

import { getFriendlyNameForPartitionId } from '../../../../../../common/log_analysis';

export const DatasetsSelector: React.FunctionComponent<{
  availableDatasets: string[];
}> = ({ availableDatasets }) => {
  const options = useMemo(
    () =>
      availableDatasets.map(dataset => ({
        value: dataset,
        label: getFriendlyNameForPartitionId(dataset),
      })),
    [availableDatasets]
  );
  return <EuiComboBox options={options} placeholder={datasetFilterPlaceholder} />;
};

const datasetFilterPlaceholder = i18n.translate(
  'xpack.infra.logs.logEntryCategories.datasetFilterPlaceholder',
  {
    defaultMessage: 'Select data sets',
  }
);
