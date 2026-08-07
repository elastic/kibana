/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { defer } from 'lodash';
import React, { useCallback, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { useCreateOAuthClient } from '../../../hooks/oauth_clients/use_create_oauth_client';
import type { McpClientFormData } from './types';
import { useMcpClientForm } from './use_mcp_client_form';
import { useKibana } from '../../../hooks/use_kibana';
import { useNavigation } from '../../../hooks/use_navigation';
import { useToasts } from '../../../hooks/use_toasts';
import { appPaths } from '../../../utils/app_paths';
import { labels } from '../../../utils/i18n';
import illustrationGenai from '../assets/illustration_genai.svg';
import { McpClientForm } from './mcp_client_form';
import { toCreateOAuthClientPayload } from './mcp_client_transform';

const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  background-color: ${euiTheme.colors.backgroundBasePlain};
  border-block-end: none;
`;

export const McpClientCreate = () => {
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { createOAuthClient, isCreating } = useCreateOAuthClient();
  const { addSuccessToast, addErrorToast } = useToasts();
  const { services } = useKibana();
  const {
    appParams: { history },
    http,
    application: { navigateToUrl },
    overlays: { openConfirm },
  } = services;

  const [isCancelling, setIsCancelling] = useState(false);

  const form = useMcpClientForm();
  const { handleSubmit, formState } = form;
  const { errors, isDirty, isSubmitSuccessful } = formState;
  const hasErrors = Object.keys(errors).length > 0;

  const handleCancel = useCallback(() => {
    setIsCancelling(true);
    defer(() => navigateToAgentBuilderUrl(appPaths.manage.mcpClients));
  }, [navigateToAgentBuilderUrl]);

  const handleCreate = useCallback(
    async (data: McpClientFormData) => {
      try {
        const response = await createOAuthClient(toCreateOAuthClientPayload(data));

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

  useUnsavedChangesPrompt({
    hasUnsavedChanges: !isCancelling && isDirty && !isSubmitSuccessful,
    history,
    http,
    navigateToUrl,
    openConfirm,
    shouldPromptOnReplace: false,
  });

  return (
    <FormProvider {...form}>
      <KibanaPageTemplate data-test-subj="agentBuilderMcpClientCreatePage">
        <KibanaPageTemplate.Header
          css={headerStyles}
          pageTitle={labels.tools.mcpClients.form.pageTitle}
          description={labels.tools.mcpClients.form.pageDescription}
          rightSideItems={[<EuiImage src={illustrationGenai} alt="" size="100px" />]}
        />
        <KibanaPageTemplate.Section>
          <McpClientForm onSubmit={handleSubmit(handleCreate)} />
          <EuiSpacer size="xl" />
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="m"
                color="text"
                onClick={handleCancel}
                {...getEbtProps({
                  element: AGENT_BUILDER_UI_EBT.element.pageContent,
                  action: AGENT_BUILDER_UI_EBT.action.globalManagement.MCP_CLIENT_CREATE_CANCEL,
                  detail: AGENT_BUILDER_UI_EBT.entity.MCP_CLIENT,
                })}
              >
                {labels.tools.mcpClients.form.cancelButton}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="m"
                fill
                onClick={handleSubmit(handleCreate)}
                isLoading={isCreating}
                disabled={hasErrors || isCreating}
                data-test-subj="mcpClientCreateButton"
                {...getEbtProps({
                  element: AGENT_BUILDER_UI_EBT.element.pageContent,
                  action: AGENT_BUILDER_UI_EBT.action.globalManagement.MCP_CLIENT_CREATE_SUBMIT,
                  detail: AGENT_BUILDER_UI_EBT.entity.MCP_CLIENT,
                })}
              >
                {labels.tools.mcpClients.form.createButton}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    </FormProvider>
  );
};
