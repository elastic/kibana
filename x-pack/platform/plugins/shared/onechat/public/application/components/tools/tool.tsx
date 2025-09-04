/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { EsqlToolDefinitionWithSchema } from '@kbn/onechat-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useCallback, useEffect, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type {
  CreateToolPayload,
  CreateToolResponse,
  UpdateToolPayload,
  UpdateToolResponse,
} from '../../../../common/http_api/tools';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import {
  transformEsqlFormDataForCreate,
  transformEsqlFormDataForUpdate,
  transformEsqlToolToFormData,
} from '../../utils/transform_esql_form_data';
import { ToolForm, ToolFormMode } from './form/tool_form';
import type { EsqlToolFormData } from './form/types/tool_form_types';
import { useEsqlToolForm } from '../../hooks/tools/use_esql_tool_form';
import { OnechatTestFlyout } from './execute/test_tools';

interface ToolBaseProps {
  tool?: EsqlToolDefinitionWithSchema;
  isLoading: boolean;
  isSubmitting: boolean;
}

interface ToolCreateProps extends ToolBaseProps {
  mode: ToolFormMode.Create;
  saveTool: (data: CreateToolPayload) => Promise<CreateToolResponse>;
}

interface ToolEditProps extends ToolBaseProps {
  mode: ToolFormMode.Edit;
  saveTool: (data: UpdateToolPayload) => Promise<UpdateToolResponse>;
}

export type ToolProps = ToolCreateProps | ToolEditProps;

export const Tool: React.FC<ToolProps> = ({ mode, tool, isLoading, isSubmitting, saveTool }) => {
  const { euiTheme } = useEuiTheme();
  const { navigateToOnechatUrl } = useNavigation();
  const form = useEsqlToolForm();
  const { reset, formState, watch, handleSubmit } = form;
  const { errors } = formState;
  const [showTestFlyout, setShowTestFlyout] = useState(false);

  const currentToolId = watch('toolId');

  const handleCancel = useCallback(() => {
    navigateToOnechatUrl(appPaths.tools.list);
  }, [navigateToOnechatUrl]);

  const handleSave = useCallback(
    async (data: EsqlToolFormData, shouldRedirect = true) => {
      if (mode === ToolFormMode.Edit) {
        await saveTool(transformEsqlFormDataForUpdate(data));
      } else {
        await saveTool(transformEsqlFormDataForCreate(data));
      }
      navigateToOnechatUrl(appPaths.tools.list);
    },
    [mode, saveTool, navigateToOnechatUrl]
  );

  const handleTestTool = useCallback(() => {
    setShowTestFlyout(true);
  }, []);

  const handleSaveAndTest = useCallback(
    async (data: EsqlToolFormData) => {
      await handleSave(data, false);
      handleTestTool();
    },
    [handleSave, handleTestTool]
  );

  useEffect(() => {
    if (tool) {
      reset(transformEsqlToolToFormData(tool), {
        keepDefaultValues: true,
        keepDirty: true,
      });
    }
  }, [tool, reset]);

  const esqlToolFormId = useGeneratedHtmlId({
    prefix: 'esqlToolForm',
  });

  const saveButton = (
    <EuiButton
      size="s"
      type="submit"
      fill
      iconType="save"
      form={esqlToolFormId}
      disabled={Object.keys(errors).length > 0 || isSubmitting}
      isLoading={isSubmitting}
      css={css`
        width: 124px;
      `}
    >
      {labels.tools.saveButtonLabel}
    </EuiButton>
  );

  const saveAndTestButton = (
    <EuiButton
      size="s"
      iconType="eye"
      onClick={handleSubmit(handleSaveAndTest)}
      disabled={Object.keys(errors).length > 0 || isSubmitting}
      isLoading={isSubmitting}
      css={css`
        width: 124px;
      `}
    >
      {i18n.translate('xpack.onechat.tools.esqlToolFlyout.saveAndTestButtonLabel', {
        defaultMessage: 'Save & test',
      })}
    </EuiButton>
  );

  const testButton = (
    <EuiButton
      size="s"
      onClick={handleTestTool}
      disabled={Object.keys(errors).length > 0}
      iconType="eye"
      css={css`
        width: 124px;
      `}
    >
      {i18n.translate('xpack.onechat.tools.esqlToolFlyout.testButtonLabel', {
        defaultMessage: 'Test',
      })}
    </EuiButton>
  );

  return (
    <FormProvider {...form}>
      <KibanaPageTemplate>
        <KibanaPageTemplate.Header
          pageTitle={mode === ToolFormMode.Edit ? tool?.id : labels.tools.newToolTitle}
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
              <ToolForm mode={mode} formId={esqlToolFormId} saveTool={handleSave} />
              {showTestFlyout && currentToolId && (
                <OnechatTestFlyout
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
        </KibanaPageTemplate.Section>
        <KibanaPageTemplate.BottomBar
          css={css`
            z-index: ${euiTheme.levels.header};
          `}
          paddingSize="m"
          restrictWidth={false}
        >
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" iconType="cross" onClick={handleCancel}>
                {labels.tools.cancelButtonLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {mode === ToolFormMode.Edit ? testButton : saveAndTestButton}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {Object.keys(errors).length > 0 ? (
                <EuiToolTip display="block" content={labels.tools.saveButtonTooltip}>
                  {saveButton}
                </EuiToolTip>
              ) : (
                saveButton
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </KibanaPageTemplate.BottomBar>
      </KibanaPageTemplate>
    </FormProvider>
  );
};
