/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useAbortableAsync } from '@kbn/react-hooks';
import { defer } from 'lodash';
import React, { useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useOAuthClient } from '../../../hooks/oauth_clients/use_oauth_client';
import { useUpdateOAuthClient } from '../../../hooks/oauth_clients/use_update_oauth_client';
import { useNavigation } from '../../../hooks/use_navigation';
import { useToasts } from '../../../hooks/use_toasts';
import { appPaths } from '../../../utils/app_paths';
import { labels } from '../../../utils/i18n';
import { McpClientFormPage, McpClientPageLayout } from './mcp_client_form_page';
import { oauthClientToFormData, toUpdateOAuthClientPayload } from './mcp_client_transform';
import { resolveClientLogoFormValue } from './mcp_logo_prefill';
import type { McpClientFormData } from './types';
import { McpClientFormMode } from './types';

export const McpClientEdit = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { addSuccessToast, addErrorToast } = useToasts();
  const { client, isLoading } = useOAuthClient(clientId);
  const { updateOAuthClient, isUpdating } = useUpdateOAuthClient();

  const { value: initialValues } = useAbortableAsync(async () => {
    if (!client) {
      return undefined;
    }
    const clientLogo = await resolveClientLogoFormValue(client.client_logo);
    return oauthClientToFormData(client, clientLogo);
  }, [client]);

  const isEditable = Boolean(client) && !client?.revoked;

  useEffect(() => {
    if (isLoading || isEditable) {
      return;
    }
    navigateToAgentBuilderUrl(appPaths.manage.mcpClients);
  }, [isLoading, isEditable, navigateToAgentBuilderUrl]);

  const handleUpdate = useCallback(
    async (data: McpClientFormData) => {
      try {
        await updateOAuthClient({ clientId, payload: toUpdateOAuthClientPayload(data) });

        addSuccessToast({
          title: labels.tools.mcpClients.form.updateSuccessToast(data.clientName),
        });

        defer(() => navigateToAgentBuilderUrl(appPaths.manage.mcpClients));
      } catch (error) {
        addErrorToast({
          title: labels.tools.mcpClients.form.updateErrorToast,
          text: formatAgentBuilderErrorMessage(error),
        });
      }
    },
    [updateOAuthClient, clientId, navigateToAgentBuilderUrl, addSuccessToast, addErrorToast]
  );

  if (!isLoading && !isEditable) {
    return null;
  }

  if (!initialValues) {
    return (
      <McpClientPageLayout mode={McpClientFormMode.EDIT}>
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xxl" data-test-subj="mcpClientEditLoading" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </McpClientPageLayout>
    );
  }

  return (
    <McpClientFormPage
      mode={McpClientFormMode.EDIT}
      initialValues={initialValues}
      isSubmitting={isUpdating}
      onSubmit={handleUpdate}
    />
  );
};
