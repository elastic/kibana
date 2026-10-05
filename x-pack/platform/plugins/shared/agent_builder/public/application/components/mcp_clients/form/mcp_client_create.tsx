/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { defer } from 'lodash';
import React, { useCallback } from 'react';
import { useCreateOAuthClient } from '../../../hooks/oauth_clients/use_create_oauth_client';
import { useNavigation } from '../../../hooks/use_navigation';
import { useToasts } from '../../../hooks/use_toasts';
import { appPaths } from '../../../utils/app_paths';
import { labels } from '../../../utils/i18n';
import { McpClientFormPage } from './mcp_client_form_page';
import { toCreateOAuthClientPayload } from './mcp_client_transform';
import { loadDefaultLogoDataUrl } from './mcp_logo_options';
import type { McpClientFormData } from './types';
import { McpClientFormMode } from './types';

const resolveDefaultLogoDataUrl = async (): Promise<string | undefined> => {
  try {
    return await loadDefaultLogoDataUrl();
  } catch {
    return undefined;
  }
};

export const McpClientCreate = () => {
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { createOAuthClient, isCreating } = useCreateOAuthClient();
  const { addSuccessToast, addErrorToast } = useToasts();

  const handleCreate = useCallback(
    async (data: McpClientFormData) => {
      try {
        const fallbackLogoDataUrl =
          data.clientLogo.type === 'none' ? await resolveDefaultLogoDataUrl() : undefined;
        const response = await createOAuthClient(
          toCreateOAuthClientPayload(data, fallbackLogoDataUrl)
        );

        addSuccessToast({
          title: labels.tools.mcpClients.form.createSuccessToast(data.clientName),
        });

        defer(() =>
          navigateToAgentBuilderUrl(appPaths.manage.mcpClients, undefined, {
            mcpClientCreated: response,
          })
        );
      } catch (error) {
        addErrorToast({
          title: labels.tools.mcpClients.form.createErrorToast,
          text: formatAgentBuilderErrorMessage(error),
        });
      }
    },
    [createOAuthClient, navigateToAgentBuilderUrl, addSuccessToast, addErrorToast]
  );

  return (
    <McpClientFormPage
      mode={McpClientFormMode.CREATE}
      isSubmitting={isCreating}
      onSubmit={handleCreate}
    />
  );
};
