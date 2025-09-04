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
import type { IndexSearchToolDefinitionWithSchema } from '@kbn/onechat-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useCallback, useEffect, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type {
  CreateToolPayload,
  CreateToolResponse,
  UpdateToolPayload,
  UpdateToolResponse,
} from '../../../../../common/http_api/tools';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { labels } from '../../../utils/i18n';
import {
  transformIndexSearchFormDataForCreate,
  transformIndexSearchFormDataForUpdate,
  transformIndexSearchToolToFormData,
} from '../../../utils/transform_index_search_form_data';
import {
  OnechatIndexSearchToolForm,
  OnechatIndexSearchToolFormMode,
} from './form/index_search_tool_form';
import type { OnechatIndexSearchToolFormData } from './form/types/index_search_tool_form_types';
import { useIndexSearchToolForm } from '../../../hooks/tools/use_index_search_tool_form';
import { OnechatTestFlyout } from '../execute/test_tools';

interface IndexSearchToolBaseProps {
  tool?: IndexSearchToolDefinitionWithSchema;
  isLoading: boolean;
  isSubmitting: boolean;
}

interface IndexSearchToolCreateProps extends IndexSearchToolBaseProps {
  mode: OnechatIndexSearchToolFormMode.Create;
  saveTool: (data: CreateToolPayload) => Promise<CreateToolResponse>;
}

interface IndexSearchToolEditProps extends IndexSearchToolBaseProps {
  mode: OnechatIndexSearchToolFormMode.Edit;
  saveTool: (data: UpdateToolPayload) => Promise<UpdateToolResponse>;
}

export type IndexSearchToolProps = IndexSearchToolCreateProps | IndexSearchToolEditProps;

export const IndexSearchTool: React.FC<IndexSearchToolProps> = ({
  mode,
  tool,
  isLoading,
  isSubmitting,
  saveTool,
}) => {
  const { euiTheme } = useEuiTheme();
  const { navigateToOnechatUrl } = useNavigation();
  const form = useIndexSearchToolForm();
  const { reset, formState, watch } = form;
  const { errors, isDirty } = formState;
  const [showTestFlyout, setShowTestFlyout] = useState(false);

  const currentToolId = watch('name');

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  const handleSave = useCallback(
    async (data: OnechatIndexSearchToolFormData) => {
      if (mode === OnechatIndexSearchToolFormMode.Edit) {
        await saveTool(transformIndexSearchFormDataForUpdate(data));
      } else {
        await saveTool(transformIndexSearchFormDataForCreate(data));
      }
      navigateToOnechatUrl(appPaths.tools.list);
    },
    [mode, saveTool, navigateToOnechatUrl]
  );

  useEffect(() => {
    if (tool) {
      reset(transformIndexSearchToolToFormData(tool), {
        keepDefaultValues: true,
        keepDirty: true,
      });
    }
  }, [tool, reset]);

  const indexSearchToolFormId = useGeneratedHtmlId({
    prefix: 'indexSearchToolForm',
  });

  const saveButton = (
    <EuiButton
      type="submit"
      fill
      fullWidth
      form={indexSearchToolFormId}
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
        if (mode === OnechatIndexSearchToolFormMode.Edit) {
          await saveTool(transformIndexSearchFormDataForUpdate(formData));
        } else {
          await saveTool(transformIndexSearchFormDataForCreate(formData));
        }
        if (currentToolId) {
          setShowTestFlyout(true);
        }
      }}
      disabled={Object.keys(errors).length > 0 || isSubmitting}
      isLoading={isSubmitting}
    >
      {i18n.translate('xpack.onechat.tools.indexSearchToolFlyout.saveAndTestButtonLabel', {
        defaultMessage: 'Save and Test',
      })}
    </EuiButton>
  );

  const testButton = (
    <EuiButton
      fill
      onClick={() => {
        setShowTestFlyout(true);
      }}
      disabled={Object.keys(errors).length > 0}
    >
      {i18n.translate('xpack.onechat.tools.indexSearchToolFlyout.testButtonLabel', {
        defaultMessage: 'Test',
      })}
    </EuiButton>
  );

  return (
    <FormProvider {...form}>
      <KibanaPageTemplate>
        <KibanaPageTemplate.Header
          pageTitle={
            mode === OnechatIndexSearchToolFormMode.Edit
              ? labels.tools.editIndexSearchToolTitle
              : labels.tools.newIndexSearchToolTitle
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
              <OnechatIndexSearchToolForm
                mode={mode}
                formId={indexSearchToolFormId}
                saveTool={handleSave}
              />
              {showTestFlyout && currentToolId && (
                <OnechatTestFlyout
                  isOpen={showTestFlyout}
                  isLoading={isLoading}
                  toolId={currentToolId}
                  onClose={() => {
                    setShowTestFlyout(false);
                    if (mode === OnechatIndexSearchToolFormMode.Create) {
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
