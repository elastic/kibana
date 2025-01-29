/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC, PropsWithChildren } from 'react';
import { KQLSyntaxError } from '@kbn/es-query';
import { RenderErrorFunc, ResettableErrorBoundary } from '../resettable_error_boundary';

export const LogStreamErrorBoundary: FC<
  PropsWithChildren<{
    resetOnChange: any;
  }>
> = ({ children, resetOnChange = null }) => {
  return (
    <ResettableErrorBoundary
      renderError={renderLogStreamErrorContent}
      resetOnChange={resetOnChange}
    >
      {children}
    </ResettableErrorBoundary>
  );
};

const LogStreamErrorContent: React.FC<{
  error: any;
}> = ({ error }) => {
  if (error instanceof KQLSyntaxError) {
    return (
      <EuiEmptyPrompt
        title={
          <FormattedMessage
            id="xpack.logsShared.logStream.kqlErrorTitle"
            defaultMessage="Invalid KQL expression"
            tagName="h2"
          />
        }
        body={<EuiCodeBlock className="eui-textLeft">{error.message}</EuiCodeBlock>}
      />
    );
  } else {
    return (
      <EuiEmptyPrompt
        title={
          <FormattedMessage
            id="xpack.logsShared.logStream.unknownErrorTitle"
            defaultMessage="An error occurred"
            tagName="h2"
          />
        }
        body={<EuiCodeBlock className="eui-textLeft">{error.message}</EuiCodeBlock>}
      />
    );
  }
};

const renderLogStreamErrorContent: RenderErrorFunc = ({ latestError }) => (
  <LogStreamErrorContent error={latestError} />
);
