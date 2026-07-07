/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useDatasetQualityState } from '../../../hooks/use_dataset_quality_state';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function EmptyStateWrapper({ children }: { children: React.ReactNode }) {
  const { canUserMonitorAnyDataset, statsLoading } = useDatasetQualityState();

  if (!statsLoading && !canUserMonitorAnyDataset) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        color="warning"
        title={
          <h2>
            {i18n.translate('xpack.datasetQuality.emptyState.noPrivileges.title', {
              defaultMessage: `Datasets couldn't be loaded`,
            })}
          </h2>
        }
        body={
          <p data-test-subj="datasetQualityNoPrivilegesEmptyState">
            <FormattedMessage
              id="xpack.datasetQuality.emptyState.noPrivileges.message"
              defaultMessage="You don't have the required privileges to view data sets data. Make sure you have sufficient privileges to view data sets."
            />
            {/* TODO: Learn more link to docs */}
          </p>
        }
      />
    );
  }

  return <>{children}</>;
}
