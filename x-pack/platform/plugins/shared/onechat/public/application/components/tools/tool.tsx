/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { isEsqlTool, isIndexSearchTool } from '@kbn/onechat-common/tools';
import { ToolType } from '@kbn/onechat-common/tools/definition';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { defer } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import type {
  CreateToolPayload,
  CreateToolResponse,
  UpdateToolPayload,
  UpdateToolResponse,
} from '../../../../common/http_api/tools';
import { useToolForm } from '../../hooks/tools/use_tool_form';
import { useKibana } from '../../hooks/use_kibana';
import { useNavigation } from '../../hooks/use_navigation';
import { useQueryState } from '../../hooks/use_query_state';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { transformBuiltInToolToFormData } from '../../utils/transform_built_in_form_data';
import {
  transformEsqlFormDataForCreate,
  transformEsqlFormDataForUpdate,
  transformEsqlToolToFormData,
} from '../../utils/transform_esql_form_data';
import {
  transformIndexSearchFormDataForCreate,
  transformIndexSearchFormDataForUpdate,
  transformIndexSearchToolToFormData,
} from '../../utils/transform_index_search_form_data';
import { OPEN_TEST_FLYOUT_QUERY_PARAM, TOOL_TYPE_QUERY_PARAM } from './create_tool';
import { ToolTestFlyout } from './execute/test_tools';
import { ToolEditContextMenu } from './form/components/tool_edit_context_menu';
import { ToolForm, ToolFormMode } from './form/tool_form';
import type { ToolFormData } from './form/types/tool_form_types';

const BUTTON_IDS = {
  SAVE: 'save',
  SAVE_AND_TEST: 'saveAndTest',
} as const;

interface ToolBaseProps {
  tool?: ToolDefinitionWithSchema;
  isLoading: boolean;
}

interface ToolCreateProps extends ToolBaseProps {
  mode: ToolFormMode.Create;
  isSubmitting: boolean;
  saveTool: (data: CreateToolPayload) => Promise<CreateToolResponse>;
}

interface ToolEditProps extends ToolBaseProps {
  mode: ToolFormMode.Edit;
  isSubmitting: boolean;
  saveTool: (data: UpdateToolPayload) => Promise<UpdateToolResponse>;
}

interface ToolViewProps extends ToolBaseProps {
  mode: ToolFormMode.View;
  isSubmitting?: never;
  saveTool?: never;
}

export type ToolProps = ToolCreateProps | ToolEditProps | ToolViewProps;

export const Tool: React.FC<ToolProps> = ({ mode, tool, isLoading, isSubmitting, saveTool }) => {
  const { euiTheme } = useEuiTheme();
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const { navigateToOnechatUrl } = useNavigation();
  // Resolve state updates before navigation to avoid triggering unsaved changes prompt
  const deferNavigateToOnechatUrl = useCallback(
    (...args: Parameters<typeof navigateToOnechatUrl>) => {
      defer(() => navigateToOnechatUrl(...args));
    },
    [navigateToOnechatUrl]
  );
  const [openTestFlyoutParam, setOpenTestFlyoutParam] = useQueryState<boolean>(
    OPEN_TEST_FLYOUT_QUERY_PARAM,
    { defaultValue: false }
  );
  const [urlToolType] = useQueryState<ToolType | undefined>(TOOL_TYPE_QUERY_PARAM);

  const initialToolType = useMemo(() => {
    switch (urlToolType) {
      case ToolType.esql:
      case ToolType.index_search:
        return urlToolType;
      default:
        return undefined;
    }
  }, [urlToolType]);

  const form = useToolForm(tool, initialToolType);
  const { reset, formState, watch, handleSubmit } = form;
  const { errors, isDirty, isSubmitSuccessful } = formState;
  const [showTestFlyout, setShowTestFlyout] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [submittingButtonId, setSubmittingButtonId] = useState<string | undefined>();
  const { services } = useKibana();
  const {
    application: { navigateToUrl },
    overlays: { openConfirm },
    http,
    appParams: { history },
  } = services;

  const currentToolId = watch('toolId');

  // Handle opening test tool flyout on navigation
  useEffect(() => {
    if (openTestFlyoutParam && currentToolId && !showTestFlyout) {
      setShowTestFlyout(true);
      setOpenTestFlyoutParam(false);
    }
  }, [openTestFlyoutParam, currentToolId, showTestFlyout, setOpenTestFlyoutParam]);

  const handleCancel = useCallback(() => {
    setIsCancelling(true);
    deferNavigateToOnechatUrl(appPaths.tools.list);
  }, [deferNavigateToOnechatUrl]);

  const handleSave = useCallback(
    async (
      data: ToolFormData,
      {
        navigateToListView = true,
        buttonId = BUTTON_IDS.SAVE,
      }: { navigateToListView?: boolean; buttonId?: string } = {}
    ) => {
      if (mode === ToolFormMode.View) return;
      setSubmittingButtonId(buttonId);
      try {
        if (mode === ToolFormMode.Edit) {
          switch (data.type) {
            case ToolType.esql:
              await saveTool(transformEsqlFormDataForUpdate(data));
              break;
            case ToolType.index_search:
              await saveTool(transformIndexSearchFormDataForUpdate(data));
              break;
            default:
              break;
          }
        } else {
          switch (data.type) {
            case ToolType.esql:
              await saveTool(transformEsqlFormDataForCreate(data));
              break;
            case ToolType.index_search:
              await saveTool(transformIndexSearchFormDataForCreate(data));
              break;
            default:
              break;
          }
        }
      } finally {
        setSubmittingButtonId(undefined);
      }
      if (navigateToListView) {
        deferNavigateToOnechatUrl(appPaths.tools.list);
      }
    },
    [mode, saveTool, deferNavigateToOnechatUrl]
  );

  const handleTestTool = useCallback(() => {
    setShowTestFlyout(true);
  }, []);

  const handleSaveAndTest = useCallback(
    async (data: ToolFormData) => {
      await handleSave(data, { navigateToListView: false, buttonId: BUTTON_IDS.SAVE_AND_TEST });
      handleTestTool();
    },
    [handleSave, handleTestTool]
  );

  useEffect(() => {
    if (tool) {
      if (isEsqlTool(tool)) {
        reset(transformEsqlToolToFormData(tool));
      } else if (isIndexSearchTool(tool)) {
        reset(transformIndexSearchToolToFormData(tool));
      } else if (tool.type === ToolType.builtin) {
        reset(transformBuiltInToolToFormData(tool));
      }
    }
  }, [tool, reset]);

  const toolFormId = useGeneratedHtmlId({
    prefix: 'toolForm',
  });

  const isViewMode = mode === ToolFormMode.View;
  const hasErrors = Object.keys(errors).length > 0;

  const renderSaveButton = useCallback(
    ({ size = 's' }: Pick<EuiButtonProps, 'size'> = {}) => {
      const saveButton = (
        <EuiButton
          size={size}
          type="submit"
          fill
          iconType="save"
          form={toolFormId}
          disabled={hasErrors || isSubmitting || (mode === ToolFormMode.Edit && !isDirty)}
          isLoading={submittingButtonId === BUTTON_IDS.SAVE}
          minWidth={mode === ToolFormMode.Create ? '124px' : '112px'}
        >
          {labels.tools.saveButtonLabel}
        </EuiButton>
      );
      return hasErrors ? (
        <EuiToolTip display="block" content={labels.tools.saveButtonTooltip}>
          {saveButton}
        </EuiToolTip>
      ) : (
        saveButton
      );
    },
    [toolFormId, hasErrors, isSubmitting, mode, isDirty, submittingButtonId]
  );

  const renderTestButton = useCallback(
    ({ size = 's' }: Pick<EuiButtonProps, 'size'> = {}) => {
      const isCreateMode = mode === ToolFormMode.Create;
      const commonProps: EuiButtonProps = {
        size,
        iconType: 'play',
        isDisabled: hasErrors || isSubmitting,
      };
      return isCreateMode ? (
        <EuiButton
          {...commonProps}
          onClick={handleSubmit(handleSaveAndTest)}
          isLoading={submittingButtonId === BUTTON_IDS.SAVE_AND_TEST}
          minWidth="124px"
        >
          {i18n.translate('xpack.onechat.tools.esqlToolFlyout.saveAndTestButtonLabel', {
            defaultMessage: 'Save & test',
          })}
        </EuiButton>
      ) : (
        <EuiButton {...commonProps} onClick={handleTestTool} minWidth="112px">
          {i18n.translate('xpack.onechat.tools.esqlToolFlyout.testButtonLabel', {
            defaultMessage: 'Test',
          })}
        </EuiButton>
      );
    },
    [
      mode,
      handleSubmit,
      handleSaveAndTest,
      handleTestTool,
      hasErrors,
      isSubmitting,
      submittingButtonId,
    ]
  );

  useUnsavedChangesPrompt({
    hasUnsavedChanges: !isViewMode && isDirty && !isSubmitSuccessful && !isCancelling,
    history,
    http,
    navigateToUrl,
    openConfirm,
  });

  return (
    <FormProvider {...form}>
      <KibanaPageTemplate>
        <KibanaPageTemplate.Header
          pageTitle={
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                {[ToolFormMode.View, ToolFormMode.Edit].includes(mode)
                  ? tool?.id
                  : labels.tools.newToolTitle}
              </EuiFlexItem>
              {tool?.readonly && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow" iconType="lock">
                    {labels.tools.readOnly}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
          rightSideItems={[
            ...(mode !== ToolFormMode.View ? [renderSaveButton({ size: 'm' })] : []),
            renderTestButton({ size: 'm' }),
            ...(mode === ToolFormMode.Edit ? [<ToolEditContextMenu />] : []),
          ]}
          rightSideGroupProps={{ gutterSize: 's' }}
          css={css`
            background-color: ${euiTheme.colors.backgroundBasePlain};
            border-block-end: none;
          `}
        />
        <KibanaPageTemplate.Section>
          {isLoading ? (
            <EuiFlexGroup justifyContent="center" alignItems="center">
              <EuiLoadingSpinner size="xxl" />
            </EuiFlexGroup>
          ) : (
            <>
              {isViewMode ? (
                <ToolForm mode={ToolFormMode.View} formId={toolFormId} />
              ) : (
                <ToolForm mode={mode} formId={toolFormId} saveTool={handleSave} />
              )}
              {showTestFlyout && currentToolId && (
                <ToolTestFlyout
                  isOpen={showTestFlyout}
                  isLoading={isLoading}
                  toolId={currentToolId}
                  onClose={() => {
                    setShowTestFlyout(false);
                    if (mode === ToolFormMode.Create) {
                      navigateToOnechatUrl(appPaths.tools.list);
                    }
                  }}
                />
              )}
            </>
          )}
          <EuiSpacer
            css={css`
              height: ${!isMobile || isViewMode ? euiTheme.size.xxxxl : '144px'};
            `}
          />
        </KibanaPageTemplate.Section>
        <KibanaPageTemplate.BottomBar
          css={css`
            z-index: ${euiTheme.levels.header};
          `}
          paddingSize="m"
          restrictWidth={false}
          position="fixed"
          usePortal
        >
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            {mode !== ToolFormMode.View && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty size="s" iconType="cross" color="text" onClick={handleCancel}>
                  {labels.tools.cancelButtonLabel}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>{renderTestButton()}</EuiFlexItem>
            {mode !== ToolFormMode.View && (
              <EuiFlexItem grow={false}>{renderSaveButton()}</EuiFlexItem>
            )}
          </EuiFlexGroup>
        </KibanaPageTemplate.BottomBar>
      </KibanaPageTemplate>
    </FormProvider>
  );
};
