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
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { defer } from 'lodash';
import React, { useCallback, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { useKibana } from '../../../hooks/use_kibana';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { labels } from '../../../utils/i18n';
import illustrationGenai from '../assets/illustration_genai.svg';
import { McpClientForm } from './mcp_client_form';
import type { McpClientFormData } from './types';
import { McpClientFormMode } from './types';
import { useMcpClientForm } from './use_mcp_client_form';

const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  background-color: ${euiTheme.colors.backgroundBasePlain};
  border-block-end: none;
`;

interface ModeConfig {
  pageTitle: string;
  pageTestSubj: string;
  submitLabel: string;
  submitTestSubj: string;
  submitAction: string;
  cancelAction: string;
}

const MODE_CONFIG: Record<McpClientFormMode, ModeConfig> = {
  [McpClientFormMode.CREATE]: {
    pageTitle: labels.tools.mcpClients.form.pageTitle,
    pageTestSubj: 'agentBuilderMcpClientCreatePage',
    submitLabel: labels.tools.mcpClients.form.createButton,
    submitTestSubj: 'mcpClientCreateButton',
    submitAction: AGENT_BUILDER_UI_EBT.action.globalManagement.MCP_CLIENT_CREATE_SUBMIT,
    cancelAction: AGENT_BUILDER_UI_EBT.action.globalManagement.MCP_CLIENT_CREATE_CANCEL,
  },
  [McpClientFormMode.EDIT]: {
    pageTitle: labels.tools.mcpClients.form.editPageTitle,
    pageTestSubj: 'agentBuilderMcpClientEditPage',
    submitLabel: labels.tools.mcpClients.form.updateButton,
    submitTestSubj: 'mcpClientUpdateButton',
    submitAction: AGENT_BUILDER_UI_EBT.action.globalManagement.MCP_CLIENT_EDIT_SUBMIT,
    cancelAction: AGENT_BUILDER_UI_EBT.action.globalManagement.MCP_CLIENT_EDIT_CANCEL,
  },
};

export interface McpClientPageLayoutProps {
  mode: McpClientFormMode;
  children: React.ReactNode;
}

export const McpClientPageLayout = ({ mode, children }: McpClientPageLayoutProps) => {
  const { pageTitle, pageTestSubj } = MODE_CONFIG[mode];

  return (
    <KibanaPageTemplate data-test-subj={pageTestSubj}>
      <KibanaPageTemplate.Header
        css={headerStyles}
        pageTitle={pageTitle}
        description={labels.tools.mcpClients.form.pageDescription}
        rightSideItems={[<EuiImage src={illustrationGenai} alt="" size="100px" />]}
      />
      <KibanaPageTemplate.Section>{children}</KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

interface BaseMcpClientFormPageProps {
  isSubmitting: boolean;
  onSubmit: (data: McpClientFormData) => Promise<void>;
}

interface CreateMcpClientFormPageProps extends BaseMcpClientFormPageProps {
  mode: McpClientFormMode.CREATE;
  initialValues?: never;
}

interface EditMcpClientFormPageProps extends BaseMcpClientFormPageProps {
  mode: McpClientFormMode.EDIT;
  initialValues: McpClientFormData;
}

export type McpClientFormPageProps = CreateMcpClientFormPageProps | EditMcpClientFormPageProps;

export const McpClientFormPage = ({
  mode,
  initialValues,
  isSubmitting,
  onSubmit,
}: McpClientFormPageProps) => {
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { services } = useKibana();
  const {
    appParams: { history },
    http,
    application: { navigateToUrl },
    overlays: { openConfirm },
  } = services;

  const [isCancelling, setIsCancelling] = useState(false);

  const form = useMcpClientForm(initialValues);
  const { handleSubmit, formState } = form;
  const { errors, isDirty, isSubmitSuccessful } = formState;
  const hasErrors = Object.keys(errors).length > 0;

  const { submitLabel, submitTestSubj, submitAction, cancelAction } = MODE_CONFIG[mode];

  const handleCancel = useCallback(() => {
    setIsCancelling(true);
    defer(() => navigateToAgentBuilderUrl(appPaths.manage.mcpClients));
  }, [navigateToAgentBuilderUrl]);

  useUnsavedChangesPrompt({
    hasUnsavedChanges: !isCancelling && isDirty && !isSubmitSuccessful,
    history,
    http,
    navigateToUrl,
    openConfirm,
    shouldPromptOnReplace: false,
  });

  const isSubmitDisabled =
    hasErrors || isSubmitting || (mode === McpClientFormMode.EDIT && !isDirty);

  return (
    <FormProvider {...form}>
      <McpClientPageLayout mode={mode}>
        <McpClientForm mode={mode} onSubmit={handleSubmit(onSubmit)} />
        <EuiSpacer size="xl" />
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="m"
              color="text"
              onClick={handleCancel}
              data-test-subj="mcpClientFormCancelButton"
              {...getEbtProps({
                element: AGENT_BUILDER_UI_EBT.element.pageContent,
                action: cancelAction,
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
              onClick={handleSubmit(onSubmit)}
              isLoading={isSubmitting}
              disabled={isSubmitDisabled}
              data-test-subj={submitTestSubj}
              {...getEbtProps({
                element: AGENT_BUILDER_UI_EBT.element.pageContent,
                action: submitAction,
                detail: AGENT_BUILDER_UI_EBT.entity.MCP_CLIENT,
              })}
            >
              {submitLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </McpClientPageLayout>
    </FormProvider>
  );
};
