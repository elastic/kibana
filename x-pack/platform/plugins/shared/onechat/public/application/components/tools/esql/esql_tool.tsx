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
import { EsqlToolDefinitionWithSchema } from '@kbn/onechat-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useCallback, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
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
  const { reset, formState } = useFormContext();
  const { errors } = formState;

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
      reset(transformEsqlToolToFormData(tool), { keepDefaultValues: true });
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

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={labels.tools.editEsqlToolTitle}
        breadcrumbs={[
          {
            text: labels.tools.title,
            color: 'subdued',
            onClick: () => navigateToOnechatUrl(appPaths.tools.list),
          },
        ]}
        breadcrumbProps={{
          css: css`
            margin-block-end: ${euiTheme.size.l};
          `,
        }}
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
          <OnechatEsqlToolForm mode={mode} formId={esqlToolFormId} saveTool={handleSave} />
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
  );
};
