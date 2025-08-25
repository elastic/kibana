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
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiThemeComputed,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EsqlToolDefinitionWithSchema } from '@kbn/onechat-common';
import React, { useCallback, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { transformEsqlToolToFormData } from '../../../utils/transform_esql_form_data';
import { OnechatEsqlToolForm, OnechatEsqlToolFormMode } from './form/esql_tool_form';
import { OnechatEsqlToolFormData } from './form/types/esql_tool_form_types';
import { useEsqlToolFormValidationResolver } from './form/validation/esql_tool_form_validation';

const flyoutBodyClass = (euiTheme: EuiThemeComputed) =>
  css`
    position: relative;

    .euiFlyoutBody__overflow {
      transform: none; /* Remove the transform to avoid creating a new stacking context */
      mask-image: none; /* Remove the mask-image to avoid cutting off ES|QL suggestions */
    }

    /* Manually re-add the same fade effect to the flyout body */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: ${euiTheme.size.s};
      background: linear-gradient(to bottom, ${euiTheme.colors.plainLight}, transparent);
      pointer-events: none;
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: ${euiTheme.size.s};
      background: linear-gradient(to top, ${euiTheme.colors.plainLight}, transparent);
      pointer-events: none;
    }
  `;

export interface OnechatEsqlToolFlyoutProps {
  mode: OnechatEsqlToolFormMode;
  isOpen: boolean;
  isSubmitting: boolean;
  isLoading?: boolean;
  tool?: EsqlToolDefinitionWithSchema;
  onClose: () => void;
  submit: (data: OnechatEsqlToolFormData) => Promise<void>;
}

const getDefaultValues = (): OnechatEsqlToolFormData => ({
  name: '',
  description: '',
  esql: '',
  tags: [],
  params: [],
});

export const OnechatEsqlToolFlyout: React.FC<OnechatEsqlToolFlyoutProps> = ({
  mode,
  isOpen,
  isLoading,
  isSubmitting,
  tool,
  onClose,
  submit: saveTool,
}) => {
  const resolver = useEsqlToolFormValidationResolver();
  const form = useForm<OnechatEsqlToolFormData>({
    defaultValues: getDefaultValues(),
    resolver,
    mode: 'onBlur',
  });
  const { reset, formState, getValues } = form;
  const { errors, isSubmitSuccessful } = formState;
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    reset(tool ? transformEsqlToolToFormData(tool) : getDefaultValues());
  }, [reset, tool]);

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset(getDefaultValues());
    }
  }, [isSubmitSuccessful, reset]);

  const esqlToolFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'esqlToolFlyoutTitle',
  });
  const esqlToolFormId = useGeneratedHtmlId({
    prefix: 'esqlToolForm',
  });

  const handleClear = useCallback(() => {
    reset(getDefaultValues());
  }, [reset]);

  const handleCloseFlyout = useCallback(() => {
    // Persist form data to memory
    reset(getValues());

    onClose();
  }, [reset, onClose, getValues]);

  if (!isOpen) {
    return null;
  }

  const saveButton = (
    <EuiButton
      type="submit"
      fill
      fullWidth
      form={esqlToolFormId}
      disabled={Object.keys(errors).length > 0 || isSubmitting}
      isLoading={isSubmitting}
    >
      {i18n.translate('xpack.onechat.tools.esqlToolFlyout.saveButtonLabel', {
        defaultMessage: 'Save',
      })}
    </EuiButton>
  );

  return (
    <FormProvider {...form}>
      <EuiFlyout
        onClose={handleCloseFlyout}
        aria-labelledby={esqlToolFlyoutTitleId}
        size="m"
        maxWidth
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={esqlToolFlyoutTitleId}>
              {mode === OnechatEsqlToolFormMode.Create
                ? i18n.translate('xpack.onechat.tools.newEsqlTool.title', {
                    defaultMessage: 'New ES|QL tool',
                  })
                : i18n.translate('xpack.onechat.tools.editEsqlTool.title', {
                    defaultMessage: 'Edit ES|QL tool',
                  })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody css={flyoutBodyClass(euiTheme)}>
          {isLoading ? (
            <EuiFlexGroup justifyContent="center" alignItems="center">
              <EuiLoadingSpinner size="xxl" />
            </EuiFlexGroup>
          ) : (
            <OnechatEsqlToolForm mode={mode} formId={esqlToolFormId} saveTool={saveTool} />
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton onClick={handleClear}>
                {i18n.translate('xpack.onechat.tools.newEsqlTool.clearButtonLabel', {
                  defaultMessage: 'Clear',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              {Object.keys(errors).length > 0 ? (
                <EuiToolTip
                  display="block"
                  content={i18n.translate('xpack.onechat.tools.newEsqlTool.saveButtonTooltip', {
                    defaultMessage: 'Resolve all form errors to save.',
                  })}
                >
                  {saveButton}
                </EuiToolTip>
              ) : (
                saveButton
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </FormProvider>
  );
};
