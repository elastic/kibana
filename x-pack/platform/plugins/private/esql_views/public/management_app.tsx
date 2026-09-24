/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useState } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import type { EsqlView } from '@kbn/esql-types';
import type { EsqlViewsClient } from '@kbn/esql-utils';
import { PLUGIN_NAME } from '../common';
import { EsqlViewForm } from './esql_view_form';
import { EsqlViewsTable } from './esql_views_table';
import { translations } from './translations';
import { useEsqlViews } from './use_esql_views';

interface ManagementAppProps {
  canCreate: boolean;
  canEdit: boolean;
  client: EsqlViewsClient;
  documentationUrl: string;
}

type FormState = { type: 'create' } | { type: 'edit'; view: EsqlView };

export const ManagementApp: FunctionComponent<ManagementAppProps> = ({
  canCreate,
  canEdit,
  client,
  documentationUrl,
}) => {
  const { error, isLoading, reload, status, views } = useEsqlViews(client);
  const [formState, setFormState] = useState<FormState>();

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
  } else if (status === 'permissionDenied') {
    content = (
      <EuiEmptyPrompt
        data-test-subj="esqlViewsPermissionDenied"
        color="danger"
        iconType="lock"
        title={<h2>{translations.permissionDeniedTitle}</h2>}
        body={<p>{translations.permissionDeniedDescription}</p>}
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
    content = (
      <EsqlViewsTable
        views={views}
        error={error}
        isLoading={isLoading}
        onEdit={canEdit ? (view) => setFormState({ type: 'edit', view }) : undefined}
        onReload={reload}
      />
    );
  }

  const menu: AppHeaderMenu | undefined =
    canCreate && status === 'success'
      ? {
          primaryActionItem: {
            id: 'createEsqlView',
            iconType: 'plusCircle',
            label: translations.createViewButtonLabel,
            run: () => setFormState({ type: 'create' }),
            testId: 'esqlViewsCreateButton',
          },
        }
      : undefined;

  return (
    <div data-test-subj="esqlViewsManagementPage">
      <AppHeader
        title={PLUGIN_NAME}
        description={translations.pageDescription}
        docLink={documentationUrl}
        menu={menu}
        spacing="bleed"
      />
      <EuiSpacer size="l" />
      {content}
      {formState && (
        <EsqlViewForm
          client={client}
          onClose={() => setFormState(undefined)}
          onSave={async () => {
            await reload();
            setFormState(undefined);
          }}
          view={formState.type === 'edit' ? formState.view : undefined}
        />
      )}
    </div>
  );
};
