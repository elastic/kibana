/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { AllIntegrationsResponseIntegration, TaskStatus } from '../../../common';
import { useGetAllIntegrations } from '../../common';

function getStatusColor(
  status: TaskStatus
): 'default' | 'success' | 'danger' | 'warning' | 'hollow' {
  switch (status) {
    case 'approved':
    case 'completed':
      return 'success';
    case 'failed':
    case 'cancelled':
      return 'danger';
    case 'processing':
      return 'warning';
    case 'pending':
    default:
      return 'default';
  }
}

const ManageIntegrationsLoading = React.memo(() => (
  <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} />
));
ManageIntegrationsLoading.displayName = 'ManageIntegrationsLoading';

const ManageIntegrationsError = React.memo<{ error?: Error | null }>(({ error }) => (
  <EuiCallOut
    announceOnMount
    color="danger"
    iconType="error"
    title={
      <FormattedMessage
        id="xpack.automaticImportV2.manageIntegrations.errorTitle"
        defaultMessage="Unable to load integrations"
      />
    }
  >
    <EuiText size="s">{error?.message}</EuiText>
  </EuiCallOut>
));
ManageIntegrationsError.displayName = 'ManageIntegrationsError';

export const ManageIntegrations = React.memo(() => {
  const { integrations, isLoading, isError, error } = useGetAllIntegrations();

  const columns = useMemo<Array<EuiBasicTableColumn<AllIntegrationsResponseIntegration>>>(
    () => [
      {
        field: 'title',
        name: (
          <FormattedMessage
            id="xpack.automaticImportV2.manageIntegrations.table.integrationName"
            defaultMessage="Integration name"
          />
        ),
      },
      {
        name: (
          <FormattedMessage
            id="xpack.automaticImportV2.manageIntegrations.table.dataStreams"
            defaultMessage="Data streams"
          />
        ),
        render: (item: AllIntegrationsResponseIntegration) => (
          <EuiBadge color="hollow">
            {item.successfulDataStreamCount}/{item.totalDataStreamCount}
          </EuiBadge>
        ),
      },
      {
        field: 'status',
        name: (
          <FormattedMessage
            id="xpack.automaticImportV2.manageIntegrations.table.status"
            defaultMessage="Status"
          />
        ),
        render: (status: TaskStatus) => (
          <EuiBadge color={getStatusColor(status)}>{status}</EuiBadge>
        ),
      },
    ],
    []
  );

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={
          <FormattedMessage
            id="xpack.automaticImportV2.manageIntegrations.pageTitle"
            defaultMessage="Manage my integrations"
          />
        }
      />
      <KibanaPageTemplate.Section grow>
        {isLoading ? (
          <ManageIntegrationsLoading />
        ) : isError ? (
          <ManageIntegrationsError error={error} />
        ) : (
          <EuiBasicTable
            items={integrations}
            columns={columns}
            tableCaption="Manage created integrations"
            data-test-subj="manageIntegrationsTable"
          />
        )}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
});
ManageIntegrations.displayName = 'ManageIntegrations';
