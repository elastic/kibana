/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { EsqlViewsClient } from '@kbn/esql-utils';
import { PLUGIN_NAME } from '../common';
import { EsqlViewsTable } from './esql_views_table';
import { translations } from './translations';
import { useEsqlViews } from './use_esql_views';

interface ManagementAppProps {
  client: EsqlViewsClient;
  documentationUrl: string;
}

export const ManagementApp: FunctionComponent<ManagementAppProps> = ({
  client,
  documentationUrl,
}) => {
  const { error, reload, status, views } = useEsqlViews(client);

  let content: React.ReactNode;

  if (status === 'loading') {
    content = (
      <EuiEmptyPrompt
        data-test-subj="esqlViewsLoading"
        icon={<EuiLoadingSpinner size="xl" />}
        title={<h2>{translations.loadingTitle}</h2>}
      />
    );
  } else if (status === 'unsupported') {
    content = (
      <EuiEmptyPrompt
        data-test-subj="esqlViewsUnsupported"
        iconType="inspect"
        title={<h2>{translations.unsupportedTitle}</h2>}
        body={<p>{translations.unsupportedDescription}</p>}
      />
    );
  } else if (status === 'error') {
    content = (
      <EuiEmptyPrompt
        data-test-subj="esqlViewsError"
        color="danger"
        iconType="warning"
        title={<h2>{translations.errorTitle}</h2>}
        body={error ? <p>{error.message}</p> : undefined}
        actions={
          <EuiButton data-test-subj="esqlViewsRetryButton" fill onClick={reload}>
            {translations.retryButton}
          </EuiButton>
        }
      />
    );
  } else {
    content = <EsqlViewsTable views={views} onReload={reload} />;
  }

  return (
    <div data-test-subj="esqlViewsManagementPage">
      <AppHeader
        title={PLUGIN_NAME}
        description={{
          text: translations.pageDescription,
          learnMoreUrl: documentationUrl,
        }}
        spacing="bleed"
      />
      <EuiSpacer size="l" />
      {content}
    </div>
  );
};
