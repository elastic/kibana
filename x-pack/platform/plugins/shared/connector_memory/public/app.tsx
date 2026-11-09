/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { EuiBasicTable, EuiEmptyPrompt, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { QueryClient, QueryClientProvider, useQuery } from '@kbn/react-query';
import type { ConnectorListEntry } from '../common/types';
import { messageOf, type ConnectorMemoryApi } from './api';
import { learnLabel } from './context_tab';

const columns: Array<EuiBasicTableColumn<ConnectorListEntry>> = [
  {
    field: 'name',
    name: i18n.translate('xpack.connectorMemory.table.name', { defaultMessage: 'Connector' }),
  },
  {
    name: i18n.translate('xpack.connectorMemory.table.learns', { defaultMessage: 'Learns' }),
    render: ({ settings }: ConnectorListEntry) => learnLabel(settings),
  },
  {
    field: 'documents',
    name: i18n.translate('xpack.connectorMemory.table.cached', { defaultMessage: 'Cached files' }),
    render: (documents: number) => documents.toLocaleString(),
  },
  {
    name: i18n.translate('xpack.connectorMemory.table.crawl', {
      defaultMessage: 'Scheduled crawl',
    }),
    render: ({ schedule }: ConnectorListEntry) =>
      schedule?.status ??
      i18n.translate('xpack.connectorMemory.table.noCrawl', { defaultMessage: 'None' }),
  },
];

export const ConnectorMemoryApp = ({ api }: { api: ConnectorMemoryApi }) => {
  const { data, error, isLoading } = useQuery({
    queryKey: ['connectorMemory', 'connectors'],
    queryFn: () => api.listConnectors(),
  });

  return (
    <>
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.connectorMemory.page.title', {
          defaultMessage: 'Connector memory',
        })}
        description={i18n.translate('xpack.connectorMemory.page.description', {
          defaultMessage:
            'What agents have learned from the files they read through your connectors, so the next question can start from there. Change what a connector learns in the Context tab of its Edit connector flyout.',
        })}
        bottomBorder
      />
      <EuiSpacer size="l" />
      {error ? (
        <KbnDangerCallout
          data-test-subj="connectorMemoryError"
          title={i18n.translate('xpack.connectorMemory.page.errorTitle', {
            defaultMessage: 'The connectors could not be loaded',
          })}
        >
          {messageOf(error)}
        </KbnDangerCallout>
      ) : !isLoading && data?.length === 0 ? (
        <EuiEmptyPrompt
          data-test-subj="connectorMemoryEmpty"
          iconType="plugs"
          title={
            <h2>
              {i18n.translate('xpack.connectorMemory.page.emptyTitle', {
                defaultMessage: 'No connectors to learn from yet',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.connectorMemory.page.emptyBody', {
                defaultMessage:
                  'Connector memory works with connectors that can list and read files. Create one, and it will appear here.',
              })}
            </p>
          }
        />
      ) : (
        <EuiBasicTable<ConnectorListEntry>
          data-test-subj="connectorMemoryTable"
          tableCaption={i18n.translate('xpack.connectorMemory.table.caption', {
            defaultMessage: 'Connectors and what memory holds for each',
          })}
          items={data ?? []}
          columns={columns}
          loading={isLoading}
        />
      )}
    </>
  );
};

export const renderApp = (
  coreStart: CoreStart,
  params: ManagementAppMountParams,
  api: ConnectorMemoryApi
) => {
  params.setBreadcrumbs([
    {
      text: i18n.translate('xpack.connectorMemory.breadcrumb', {
        defaultMessage: 'Connector memory',
      }),
    },
  ]);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false } },
  });
  const root = createRoot(params.element);
  root.render(
    coreStart.rendering.addContext(
      <QueryClientProvider client={queryClient}>
        <ConnectorMemoryApp api={api} />
      </QueryClientProvider>
    )
  );
  return () => {
    root.unmount();
    queryClient.clear();
  };
};
