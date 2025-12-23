/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiButtonProps, UseEuiTheme } from '@elastic/eui';
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
  const { navigateToOnechatUrl } = useNavigation();
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

  const deferNavigateToOnechatUrl = useCallback(
    (...args: Parameters<typeof navigateToOnechatUrl>) => {
      defer(() => navigateToOnechatUrl(...args));
    },
    [navigateToOnechatUrl]
  );

  const handleCancel = useCallback(() => {
    setIsCancelling(true);
    deferNavigateToOnechatUrl(appPaths.tools.list);
  }, [deferNavigateToOnechatUrl]);

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

        deferNavigateToOnechatUrl(appPaths.tools.list);
      } catch (error) {
        addErrorToast({
          title: labels.tools.bulkImportMcp.importErrorToast,
          text: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [bulkImportTools, deferNavigateToOnechatUrl, addSuccessToast, addErrorToast]
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
          pageTitle={labels.tools.bulkImportMcp.title}
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
