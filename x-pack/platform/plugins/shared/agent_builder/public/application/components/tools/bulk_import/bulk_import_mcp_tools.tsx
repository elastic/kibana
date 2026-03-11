/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiButtonProps, UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { defer } from 'lodash';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { pushFlyoutPaddingStyles } from '../../../../common.styles';
import { labels } from '../../../utils/i18n';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { useBulkImportMcpTools } from '../../../hooks/tools/use_bulk_import_mcp_tools';
import { useToasts } from '../../../hooks/use_toasts';
import { BulkImportMcpToolsForm } from './bulk_import_mcp_tools_form';
import type { BulkImportMcpToolsFormData } from './types';
import { zodResolver } from '../../../utils/zod_resolver';
import { useBulkImportMcpToolFormValidationSchema } from '../form/validation/bulk_import_mcp_tool_form_validation';
import { useKibana } from '../../../hooks/use_kibana';

const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  background-color: ${euiTheme.colors.backgroundBasePlain};
  border-block-end: none;
`;

const TECH_PREVIEW_LABEL = i18n.translate(
  'xpack.agentBuilder.tools.bulkImportMcp.techPreviewBadgeLabel',
  { defaultMessage: 'Technical preview' }
);

const TECH_PREVIEW_DESCRIPTION = i18n.translate(
  'xpack.agentBuilder.tools.bulkImportMcp.techPreviewBadgeDescription',
  {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  }
);

const bottomBarStyles = ({ euiTheme }: UseEuiTheme) => css`
  z-index: ${euiTheme.levels.header};
`;

const defaultFormValues: BulkImportMcpToolsFormData = {
  connectorId: '',
  tools: [],
  namespace: '',
  labels: [],
};

export const BulkImportMcpTools: React.FC = () => {
  const { services } = useKibana();
  const {
    application: { navigateToUrl },
    overlays: { openConfirm },
    http,
    appParams: { history },
  } = services;
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { addSuccessToast, addErrorToast } = useToasts();

  const [isCancelling, setIsCancelling] = useState(false);

  const formId = useGeneratedHtmlId({ prefix: 'bulkImportMcpToolsForm' });
  const bulkImportMcpToolFormValidationSchema = useBulkImportMcpToolFormValidationSchema();
  const form = useForm<BulkImportMcpToolsFormData>({
    defaultValues: defaultFormValues,
    mode: 'onBlur',
    resolver: zodResolver(bulkImportMcpToolFormValidationSchema),
  });
  const { control, formState } = form;
  const { errors, isSubmitting, isDirty, isSubmitSuccessful } = formState;

  const { mutateAsync: bulkImportTools } = useBulkImportMcpTools();

  const selectedTools = useWatch({ control, name: 'tools' });

  const hasErrors = Object.keys(errors).length > 0;
  const hasSelectedTools = selectedTools.length > 0;
  const isSubmitDisabled = !hasSelectedTools || hasErrors || isSubmitting;

  useUnsavedChangesPrompt({
    hasUnsavedChanges: isDirty && !isSubmitSuccessful && !isCancelling,
    history,
    http,
    navigateToUrl,
    openConfirm,
    shouldPromptOnReplace: false,
  });

  const deferNavigateToAgentBuilderUrl = useCallback(
    (...args: Parameters<typeof navigateToAgentBuilderUrl>) => {
      defer(() => navigateToAgentBuilderUrl(...args));
    },
    [navigateToAgentBuilderUrl]
  );

  const handleCancel = useCallback(() => {
    setIsCancelling(true);
    deferNavigateToAgentBuilderUrl(appPaths.tools.list);
  }, [deferNavigateToAgentBuilderUrl]);

  const handleImport = useCallback(
    async (data: BulkImportMcpToolsFormData) => {
      const { connectorId, tools, namespace, labels: tags } = data;
      try {
        const result = await bulkImportTools({
          connectorId,
          tools,
          namespace,
          tags,
          skipExisting: true,
        });

        addSuccessToast({
          title: labels.tools.bulkImportMcp.importSuccessToast(result.summary.created),
        });

        deferNavigateToAgentBuilderUrl(appPaths.tools.list);
      } catch (error) {
        addErrorToast({
          title: labels.tools.bulkImportMcp.importErrorToast,
          text: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [bulkImportTools, deferNavigateToAgentBuilderUrl, addSuccessToast, addErrorToast]
  );

  const renderImportToolsButton = ({
    size = 's',
    testSubj,
  }: { size?: EuiButtonProps['size']; testSubj?: string } = {}) => {
    return (
      <EuiButton
        size={size}
        type="submit"
        form={formId}
        fill
        iconType="download"
        isLoading={isSubmitting}
        disabled={isSubmitDisabled}
        data-test-subj={testSubj}
      >
        {labels.tools.bulkImportMcp.importToolsButton}
      </EuiButton>
    );
  };

  return (
    <FormProvider {...form}>
      <KibanaPageTemplate data-test-subj="agentBuilderBulkImportMcpToolsPage">
        <KibanaPageTemplate.Header
          pageTitle={
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>{labels.tools.bulkImportMcp.title}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label={TECH_PREVIEW_LABEL}
                  tooltipContent={TECH_PREVIEW_DESCRIPTION}
                  size="m"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          description={labels.tools.bulkImportMcp.description}
          rightSideItems={[
            renderImportToolsButton({ size: 'm', testSubj: 'bulkImportMcpToolsImportButton' }),
          ]}
          css={headerStyles}
        />
        <KibanaPageTemplate.Section>
          <BulkImportMcpToolsForm formId={formId} onSubmit={handleImport} />
          <EuiSpacer size="xxl" />
        </KibanaPageTemplate.Section>

        <KibanaPageTemplate.BottomBar
          css={bottomBarStyles}
          paddingSize="m"
          restrictWidth={false}
          position="fixed"
          usePortal
        >
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" css={pushFlyoutPaddingStyles}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="cross"
                color="text"
                onClick={handleCancel}
                data-test-subj="bulkImportMcpToolsCancelButton"
              >
                {labels.tools.bulkImportMcp.cancelButton}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{renderImportToolsButton()}</EuiFlexItem>
          </EuiFlexGroup>
        </KibanaPageTemplate.BottomBar>
      </KibanaPageTemplate>
    </FormProvider>
  );
};
