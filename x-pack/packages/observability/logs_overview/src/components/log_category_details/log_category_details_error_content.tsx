/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface LogCategoryDetailsErrorContentProps {
  error?: Error;
  title: string;
}

export const LogCategoryDetailsErrorContent: React.FC<LogCategoryDetailsErrorContentProps> = ({
  error,
  title,
}) => {
  return (
    <EuiEmptyPrompt
      color="danger"
      iconType="error"
      title={<h2>{title}</h2>}
      body={
        <EuiCodeBlock className="eui-textLeft" whiteSpace="pre">
          <p>{error?.stack ?? error?.toString() ?? unknownErrorDescription}</p>
        </EuiCodeBlock>
      }
      layout="vertical"
    />
  );
};

const unknownErrorDescription = i18n.translate(
  'xpack.observabilityLogsOverview.logCategoryDetails.unknownErrorDescription',
  {
    defaultMessage: 'An unspecified error occurred.',
  }
);
