/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useState } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { IToasts } from '@kbn/core/public';
import type { EsqlView } from '@kbn/esql-types';
import type { EsqlViewsClient } from '@kbn/esql-utils';
import { PLUGIN_NAME } from '../common';
import { DeleteViewsModal } from './delete_views_modal';
import { EsqlViewsTable } from './esql_views_table';
import { translations } from './translations';
import type { DiscoverEsqlLocator } from './types';
import { useDeleteEsqlViews } from './use_delete_esql_views';
import { useEsqlViews } from './use_esql_views';

interface ManagementAppProps {
  client: EsqlViewsClient;
  discoverLocator?: DiscoverEsqlLocator;
  documentationUrl: string;
  toasts: IToasts;
}

export const ManagementApp: FunctionComponent<ManagementAppProps> = ({
  client,
  discoverLocator,
  documentationUrl,
  toasts,
}) => {
  const { error, isLoading, reload, status, views } = useEsqlViews(client);
  const [selectedViews, setSelectedViews] = useState<EsqlView[]>([]);

  const onDeleted = useCallback(() => {
    setSelectedViews([]);
    reload();
  }, [reload]);

  const { viewsPendingDelete, isDeleting, requestDelete, cancelDelete, confirmDelete } =
    useDeleteEsqlViews({ client, toasts, onDeleted });

  const openInDiscover = useCallback(
    (view: EsqlView) => {
      discoverLocator?.navigateSync({ query: { esql: `FROM ${view.name}` } });
    },
    [discoverLocator]
  );

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
        isDiscoverAvailable={discoverLocator !== undefined}
        selectedViews={selectedViews}
        onSelectionChange={setSelectedViews}
        onReload={reload}
        onDelete={requestDelete}
        onOpenInDiscover={openInDiscover}
      />
    );
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
      {viewsPendingDelete.length > 0 && (
        <DeleteViewsModal
          views={viewsPendingDelete}
          isDeleting={isDeleting}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};
