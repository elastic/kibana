/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EsqlToolDefinitionWithSchema, ToolType } from '@kbn/onechat-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useCallback, useEffect, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import {
  CreateToolPayload,
  CreateToolResponse,
  UpdateToolPayload,
  UpdateToolResponse,
} from '../../../../../common/http_api/tools';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { labels } from '../../../utils/i18n';
import {
  transformEsqlFormDataForCreate,
  transformEsqlFormDataForUpdate,
  transformEsqlToolToFormData,
} from '../../../utils/transform_esql_form_data';
import { OnechatEsqlToolForm, OnechatEsqlToolFormMode } from './form/esql_tool_form';
import { OnechatEsqlToolFormData } from './form/types/esql_tool_form_types';
import { useEsqlToolForm } from '../../../hooks/tools/use_esql_tool_form';
import { OnechatTestFlyout } from '../execute/test_tools';

interface EsqlToolBaseProps {
  tool?: EsqlToolDefinitionWithSchema;
  isLoading: boolean;
  isSubmitting: boolean;
}

interface EsqlToolCreateProps extends EsqlToolBaseProps {
  mode: OnechatEsqlToolFormMode.Create;
  saveTool: (data: CreateToolPayload) => Promise<CreateToolResponse>;
}

interface EsqlToolEditProps extends EsqlToolBaseProps {
  mode: OnechatEsqlToolFormMode.Edit;
  saveTool: (data: UpdateToolPayload) => Promise<UpdateToolResponse>;
}

export type EsqlToolProps = EsqlToolCreateProps | EsqlToolEditProps;

export const EsqlTool: React.FC<EsqlToolProps> = ({
  mode,
  tool,
  isLoading,
  isSubmitting,
  saveTool,
}) => {
  const { euiTheme } = useEuiTheme();
  const { navigateToOnechatUrl } = useNavigation();
  const form = useEsqlToolForm();
  const { reset, formState } = form;
  const { errors, isDirty } = formState;
  const [showTestFlyout, setShowTestFlyout] = useState(false);
  const [testToolData, setTestToolData] = useState<OnechatEsqlToolFormData>(form.getValues());

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  const handleSave = useCallback(
    async (data: OnechatEsqlToolFormData) => {
      if (mode === OnechatEsqlToolFormMode.Edit) {
        await saveTool(transformEsqlFormDataForUpdate(data));
      } else {
        await saveTool(transformEsqlFormDataForCreate(data));
      }
      navigateToOnechatUrl(appPaths.tools.list);
    },
    [mode, saveTool, navigateToOnechatUrl]
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
      type="submit"
      fill
      fullWidth
      form={esqlToolFormId}
      disabled={Object.keys(errors).length > 0 || isSubmitting}
      isLoading={isSubmitting}
    >
      {labels.tools.saveButtonLabel}
    </EuiButton>
  );

  const saveAndTestButton = (
    <EuiButton
      fill
      onClick={async () => {
        const formData = form.getValues();
        if (mode === OnechatEsqlToolFormMode.Edit) {
          await saveTool(transformEsqlFormDataForUpdate(formData));
        } else {
          await saveTool(transformEsqlFormDataForCreate(formData));
        }
        setTestToolData(formData);
        setShowTestFlyout(true);
      }}
      disabled={Object.keys(errors).length > 0 || isSubmitting}
      isLoading={isSubmitting}
    >
      {i18n.translate('xpack.onechat.tools.esqlToolFlyout.saveAndTestButtonLabel', {
        defaultMessage: 'Save and Test',
      })}
    </EuiButton>
  );

  const testButton = (
    <EuiButton
      fill
      onClick={() => {
        const formData = form.getValues();
        setTestToolData(formData);
        setShowTestFlyout(true);
      }}
      disabled={Object.keys(errors).length > 0}
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
          pageTitle={
            mode === OnechatEsqlToolFormMode.Edit
              ? labels.tools.editEsqlToolTitle
              : labels.tools.newEsqlToolTitle
          }
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
              <OnechatEsqlToolForm mode={mode} formId={esqlToolFormId} saveTool={handleSave} />
              {showTestFlyout && (
                <OnechatTestFlyout
                  isOpen={showTestFlyout}
                  isLoading={isLoading}
                  tool={
                    testToolData
                      ? {
                          id: testToolData.name,
                          type: ToolType.esql,
                          description: testToolData.description,
                          tags: testToolData.tags,
                          configuration: {
                            query: testToolData.esql,
                            params: Object.fromEntries(
                              testToolData.params.map((param: any) => [
                                param.name,
                                { type: param.type, description: param.description },
                              ])
                            ),
                          },
                        }
                      : tool
                  }
                  onClose={() => setShowTestFlyout(false)}
                />
              )}
            </>
          )}
        </KibanaPageTemplate.Section>
        <KibanaPageTemplate.BottomBar
          css={css`
            z-index: ${euiTheme.levels.header};
          `}
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton onClick={handleClear}>{labels.tools.clearButtonLabel}</EuiButton>
            </EuiFlexItem>
            {!isDirty && <EuiFlexItem>{testButton}</EuiFlexItem>}
            {isDirty && <EuiFlexItem>{saveAndTestButton}</EuiFlexItem>}
            <EuiFlexItem>
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
