/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef } from 'react';

export interface LogCategoriesCancelledContentProps {
  onRetry?: () => void;
}

export const LogCategoriesCancelledContent: React.FC<LogCategoriesCancelledContentProps> = ({
  onRetry,
}) => {
  // Move focus to the Load button on mount. Clicking Cancel destroys the focused
  // element and drops keyboard/AT users to <body> (WCAG 2.4.3). Moving focus to the
  // natural replacement is the correct response when mount is the *direct consequence*
  // of a user click that destroyed the previously focused element.
  const loadButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    loadButtonRef.current?.focus();
  }, []);

  return (
    <EuiEmptyPrompt
      color="subdued"
      data-test-subj="logsOverviewLogCategoriesCancelledPrompt"
      layout="horizontal"
      title={<h2>{cancelledContentTitle}</h2>}
      titleSize="m"
      body={<p>{cancelledContentDescription}</p>}
      actions={
        onRetry != null
          ? [
              <EuiButton
                key="load"
                buttonRef={loadButtonRef}
                data-test-subj="logsOverviewLogCategoriesLoadButton"
                onClick={onRetry}
              >
                {cancelledContentRetryButtonLabel}
              </EuiButton>,
            ]
          : []
      }
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
