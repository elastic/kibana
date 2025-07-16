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
  EuiThemeComputed,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import React, { useCallback, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useOnechatCreateTool } from '../../../hooks/use_tools';
import { transformEsqlFormData } from '../../../utils/transform_esql_form_data';
import { OnechatEsqlToolForm } from './form/esql_tool_form';
import { useEsqlToolFormValidationResolver } from './form/validation/esql_tool_form_validation';
import { OnechatEsqlToolFormData } from './form/types/esql_tool_form_types';

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

interface OnechatCreateEsqlToolFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: ToolDefinitionWithSchema) => void;
  onError?: (error: Error) => void;
}

const defaultValues: OnechatEsqlToolFormData = {
  name: '',
  description: '',
  esql: '',
  tags: [],
  params: [],
};

export const OnechatCreateEsqlToolFlyout: React.FC<OnechatCreateEsqlToolFlyoutProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
}) => {
  const resolver = useEsqlToolFormValidationResolver();
  const form = useForm<OnechatEsqlToolFormData>({
    defaultValues,
    resolver,
    mode: 'onBlur',
  });
  const { reset, formState, getValues } = form;
  const { errors, isSubmitSuccessful } = formState;
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset(defaultValues);
    }
  }, [isSubmitSuccessful, reset]);

  const newEsqlToolFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'newEsqlToolFlyoutTitle',
  });
  const newEsqlToolFormId = useGeneratedHtmlId({
    prefix: 'newEsqlToolForm',
  });

  const { createTool, isLoading: isSubmitting } = useOnechatCreateTool({
    onSuccess,
    onError,
  });

  const handleClear = useCallback(() => {
    reset(defaultValues);
  }, [reset]);

  const handleSave = useCallback(
    (data: OnechatEsqlToolFormData) => createTool(transformEsqlFormData(data)),
    [createTool]
  );

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
      form={newEsqlToolFormId}
      disabled={Object.keys(errors).length > 0 || isSubmitting}
      isLoading={isSubmitting}
    >
      {i18n.translate('xpack.onechat.tools.newEsqlTool.saveButtonLabel', {
        defaultMessage: 'Save',
      })}
    </EuiButton>
  );

  return (
    <FormProvider {...form}>
      <EuiFlyout
        onClose={handleCloseFlyout}
        aria-labelledby={newEsqlToolFlyoutTitleId}
        size="m"
        maxWidth
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={newEsqlToolFlyoutTitleId}>
              {i18n.translate('xpack.onechat.tools.newEsqlTool.title', {
                defaultMessage: 'New ES|QL tool',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody css={flyoutBodyClass(euiTheme)}>
          <OnechatEsqlToolForm formId={newEsqlToolFormId} saveTool={handleSave} />
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
