/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface LogCategoriesCancelledContentProps {
  onRetry: () => void;
}

export const LogCategoriesCancelledContent: React.FC<LogCategoriesCancelledContentProps> = ({
  onRetry,
}) => {
  return (
    <EuiEmptyPrompt
      color="subdued"
      data-test-subj="logsOverviewLogCategoriesCancelledPrompt"
      layout="horizontal"
      title={<h2>{cancelledContentTitle}</h2>}
      titleSize="m"
      body={<p>{cancelledContentDescription}</p>}
      actions={[
        <EuiButton
          autoFocus
          key="load"
          data-test-subj="logsOverviewLogCategoriesLoadButton"
          onClick={onRetry}
        >
          {cancelledContentRetryButtonLabel}
        </EuiButton>,
      ]}
    />
  );
};

const cancelledContentTitle = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.cancelledContentTitle',
  {
    defaultMessage: 'Log pattern analysis cancelled',
  }
);

const cancelledContentDescription = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.cancelledContentDescription',
  {
    defaultMessage: 'The analysis was stopped before it finished, so no log patterns were loaded.',
  }
);

const cancelledContentRetryButtonLabel = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.cancelledContentRetryButtonLabel',
  {
    defaultMessage: 'Load patterns',
  }
);
