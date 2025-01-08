/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export interface LogCategoriesLoadingContentProps {
  onCancel?: () => void;
  stage: 'counting' | 'categorizing';
}

export const LogCategoriesLoadingContent: React.FC<LogCategoriesLoadingContentProps> = ({
  onCancel,
  stage,
}) => {
  return (
    <EuiEmptyPrompt
      icon={<EuiLoadingSpinner size="xl" />}
      title={
        <h2>
          {stage === 'counting'
            ? logCategoriesLoadingStateCountingTitle
            : logCategoriesLoadingStateCategorizingTitle}
        </h2>
      }
      actions={
        onCancel != null
          ? [
              <EuiButton
                data-test-subj="o11yLogCategoriesLoadingContentButton"
                onClick={() => {
                  onCancel();
                }}
              >
                {logCategoriesLoadingStateCancelButtonLabel}
              </EuiButton>,
            ]
          : []
      }
    />
  );
};

const logCategoriesLoadingStateCountingTitle = i18n.translate(
  'xpack.observabilityLogsOverview.logCategoriesGrid.loadingStageCountingTitle',
  {
    defaultMessage: 'Estimating log volume',
  }
);

const logCategoriesLoadingStateCategorizingTitle = i18n.translate(
  'xpack.observabilityLogsOverview.logCategoriesGrid.loadingStageCategorizingTitle',
  {
    defaultMessage: 'Categorizing logs',
  }
);

const logCategoriesLoadingStateCancelButtonLabel = i18n.translate(
  'xpack.observabilityLogsOverview.logCategoriesGrid.loadingStateCancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);
