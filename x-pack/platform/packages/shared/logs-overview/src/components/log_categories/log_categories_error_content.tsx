/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiCodeBlock, EuiEmptyPrompt, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface LogCategoriesErrorContentProps {
  error?: Error;
}

export const LogCategoriesErrorContent: React.FC<LogCategoriesErrorContentProps> = ({ error }) => {
  const errorDetailsAccordionId = useGeneratedHtmlId({
    prefix: 'logsOverviewLogCategoriesErrorDetails',
  });

  return (
    <EuiEmptyPrompt
      color="danger"
      data-test-subj="logsOverviewLogCategoriesErrorPrompt"
      iconType="error"
      layout="vertical"
      title={<h2>{logsOverviewErrorTitle}</h2>}
      body={
        <>
          <p>{error?.message ?? unknownErrorDescription}</p>
          {error?.stack != null && (
            <EuiAccordion
              id={errorDetailsAccordionId}
              buttonContent={errorDetailsAccordionLabel}
              paddingSize="s"
            >
              <EuiCodeBlock
                className="eui-textLeft"
                isCopyable
                overflowHeight={200}
                whiteSpace="pre"
              >
                {error.stack}
              </EuiCodeBlock>
            </EuiAccordion>
          )}
        </>
      }
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

const errorDetailsAccordionLabel = i18n.translate(
  'xpack.observabilityLogsOverview.logCategories.errorDetailsAccordionLabel',
  {
    defaultMessage: 'Error details',
  }
);
