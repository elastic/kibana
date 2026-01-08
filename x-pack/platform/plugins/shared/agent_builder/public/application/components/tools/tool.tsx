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
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
  useIsWithinBreakpoints,
  useUpdateEffect,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ToolDefinitionWithSchema, ToolType } from '@kbn/agent-builder-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { defer } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useWatch } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { pushFlyoutPaddingStyles } from '../../../common.styles';
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
import {
  getToolTypeConfig,
  getCreatePayloadFromData,
  getUpdatePayloadFromData,
  getToolTypeDefaultValues,
} from './form/registry/tools_form_registry';
import { TOOL_TYPE_QUERY_PARAM, TEST_TOOL_ID_QUERY_PARAM } from './create_tool';
import { ToolEditContextMenu } from './form/components/tool_edit_context_menu';
import { ToolForm, ToolFormMode } from './form/tool_form';
import type { ToolFormData } from './form/types/tool_form_types';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { useToolsActions } from '../../context/tools_provider';

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
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { docLinksService } = useAgentBuilderServices();
  // Resolve state updates before navigation to avoid triggering unsaved changes prompt
  const deferNavigateToAgentBuilderUrl = useCallback(
    (...args: Parameters<typeof navigateToAgentBuilderUrl>) => {
      defer(() => navigateToAgentBuilderUrl(...args));
    },
    [navigateToAgentBuilderUrl]
  );
  const [urlToolType, setUrlToolType] = useQueryState<ToolType>(TOOL_TYPE_QUERY_PARAM);

  const initialToolType = useMemo(() => {
    if (urlToolType && getToolTypeConfig(urlToolType)) {
      return urlToolType;
    }
    return undefined;
  }, [urlToolType]);

  const form = useToolForm(tool, initialToolType);
  const { control, reset, formState, handleSubmit, getValues } = form;
  const { errors, isDirty, isSubmitSuccessful } = formState;
  const [isCancelling, setIsCancelling] = useState(false);
  const [submittingButtonId, setSubmittingButtonId] = useState<string | undefined>();
  const { testTool } = useToolsActions();
  const { services } = useKibana();
  const {
    application: { navigateToUrl },
    overlays: { openConfirm },
    http,
    appParams: { history },
  } = services;

  const currentToolId = useWatch({ name: 'toolId', control });
  const toolType = useWatch({ name: 'type', control });

  const handleCancel = useCallback(() => {
    setIsCancelling(true);
    deferNavigateToAgentBuilderUrl(appPaths.tools.list);
  }, [deferNavigateToAgentBuilderUrl]);

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
      let response: CreateToolResponse | UpdateToolResponse | undefined;
      try {
        if (mode === ToolFormMode.Edit) {
          const updatePayload = getUpdatePayloadFromData(data);
          response = await saveTool(updatePayload);
        } else {
          const createPayload = getCreatePayloadFromData(data);
          response = await saveTool(createPayload);
        }
      } finally {
        setSubmittingButtonId(undefined);
      }
      if (navigateToListView) {
        deferNavigateToAgentBuilderUrl(appPaths.tools.list);
      }
      return response;
    },
    [mode, saveTool, deferNavigateToAgentBuilderUrl]
  );

  const handleTestTool = useCallback(() => {
    if (currentToolId) {
      testTool(currentToolId);
    }
  }, [currentToolId, testTool]);

  const handleSaveAndTest = useCallback(
    async (data: ToolFormData) => {
      const response = await handleSave(data, {
        navigateToListView: false,
        buttonId: BUTTON_IDS.SAVE_AND_TEST,
      });
      if (mode === ToolFormMode.Create && response) {
        deferNavigateToAgentBuilderUrl(appPaths.tools.list, {
          [TEST_TOOL_ID_QUERY_PARAM]: response.id,
        });
      } else {
        handleTestTool();
      }
    },
    [handleSave, handleTestTool, mode, deferNavigateToAgentBuilderUrl]
  );

  useEffect(() => {
    if (tool) {
      const toolTypeConfig = getToolTypeConfig(tool.type);
      if (toolTypeConfig) {
        const { toolToFormData } = toolTypeConfig;
        reset(toolToFormData(tool));
      }
    }
  }, [tool, reset]);

  // Switching tool types clears tool-specific fields
  useUpdateEffect(() => {
    if (!toolType) return;
    if (mode !== ToolFormMode.Create) return;
    const currentValues = getValues();
    const newDefaultValues = getToolTypeDefaultValues(toolType);

    const mergedValues: ToolFormData = {
      ...newDefaultValues,
      toolId: currentValues.toolId,
      description: currentValues.description,
      labels: currentValues.labels,
    };

    reset(mergedValues);
  }, [toolType, mode, getValues, reset]);

  useEffect(() => {
    if (urlToolType && urlToolType !== toolType) {
      setUrlToolType(toolType);
    }
  }, [urlToolType, toolType, setUrlToolType]);

  const toolFormId = useGeneratedHtmlId({
    prefix: 'toolForm',
  });

  const isViewMode = mode === ToolFormMode.View;
  const hasErrors = Object.keys(errors).length > 0;

  const renderSaveButton = useCallback(
    ({ size = 's', testSubj }: { size?: EuiButtonProps['size']; testSubj?: string } = {}) => {
      const saveButton = (
        <EuiButton
          size={size}
          type="submit"
          fill
          iconType="save"
          form={toolFormId}
          disabled={hasErrors || isSubmitting || (mode === ToolFormMode.Edit && !isDirty)}
          isLoading={submittingButtonId === BUTTON_IDS.SAVE}
          minWidth="112px"
          data-test-subj={testSubj}
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
    ({ size = 's', testSubj }: Pick<EuiButtonProps, 'size'> & { testSubj?: string } = {}) => {
      const isCreateMode = mode === ToolFormMode.Create;
      const commonProps: EuiButtonProps = {
        size,
        iconType: 'play',
        isDisabled: hasErrors || isSubmitting,
      };
      return isCreateMode || isDirty ? (
        <EuiButton
          {...commonProps}
          onClick={handleSubmit(handleSaveAndTest)}
          isLoading={submittingButtonId === BUTTON_IDS.SAVE_AND_TEST}
          minWidth="124px"
          data-test-subj={testSubj}
        >
          {labels.tools.saveAndTestButtonLabel}
        </EuiButton>
      ) : (
        <EuiButton
          {...commonProps}
          onClick={handleTestTool}
          minWidth="112px"
          data-test-subj={testSubj}
        >
          {labels.tools.testButtonLabel}
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
      isDirty,
    ]
  );

  useUnsavedChangesPrompt({
    hasUnsavedChanges: !isViewMode && isDirty && !isSubmitSuccessful && !isCancelling,
    history,
    http,
    navigateToUrl,
    openConfirm,
    shouldPromptOnReplace: false,
  });

  return (
    <>
      <FormProvider {...form}>
        <KibanaPageTemplate data-test-subj="agentBuilderToolFormPage">
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
                    <EuiBadge
                      color="hollow"
                      iconType="lock"
                      data-test-subj="agentBuilderToolReadOnlyBadge"
                    >
                      {labels.tools.readOnly}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            }
            description={
              mode === ToolFormMode.Create ? (
                <FormattedMessage
                  id="xpack.agentBuilder.tools.createToolDescription"
                  defaultMessage="Give your new tool a unique ID and a clear description, so both humans and LLMs can understand its purpose. Add labels for organization, and write the index pattern or ES|QL query that powers its functionality. {learnMoreLink}"
                  values={{
                    learnMoreLink: (
                      <EuiLink
                        href={docLinksService.tools}
                        target="_blank"
                        aria-label={i18n.translate(
                          'xpack.agentBuilder.tools.createToolDocumentationAriaLabel',
                          {
                            defaultMessage: 'Learn more about creating tools in the documentation',
                          }
                        )}
                      >
                        {i18n.translate('xpack.agentBuilder.tools.createToolDocumentation', {
                          defaultMessage: 'Learn more',
                        })}
                      </EuiLink>
                    ),
                  }}
                />
              ) : undefined
            }
            rightSideItems={[
              ...(mode !== ToolFormMode.View
                ? [renderSaveButton({ size: 'm', testSubj: 'toolFormSaveButton' })]
                : []),
              renderTestButton({ size: 'm', testSubj: 'toolFormTestButton' }),
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
                <EuiSpacer
                  css={css`
                    height: ${!isMobile || isViewMode ? euiTheme.size.xxxxl : '144px'};
                  `}
                />
              </>
            )}
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
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" css={pushFlyoutPaddingStyles}>
              {mode !== ToolFormMode.View && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    aria-label={labels.tools.cancelButtonLabel}
                    size="s"
                    iconType="cross"
                    color="text"
                    onClick={handleCancel}
                  >
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
    </>
  );
};
