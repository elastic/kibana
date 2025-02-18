/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface LogCategoriesErrorContentProps {
  error?: Error;
}

export const LogCategoriesErrorContent: React.FC<LogCategoriesErrorContentProps> = ({ error }) => {
  return (
    <EuiEmptyPrompt
      color="danger"
      iconType="error"
      title={<h2>{logsOverviewErrorTitle}</h2>}
      body={
        <EuiCodeBlock className="eui-textLeft" whiteSpace="pre">
          <p>{error?.stack ?? error?.toString() ?? unknownErrorDescription}</p>
        </EuiCodeBlock>
      }
      layout="vertical"
    />
  );
};

const logsOverviewErrorTitle = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.errorTitle',
  {
    defaultMessage: 'Failed to categorize logs',
  }
);

const unknownErrorDescription = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.unknownErrorDescription',
  {
    defaultMessage: 'An unspecified error occurred.',
  }
);
