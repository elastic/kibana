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
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { OnechatEsqlToolForm } from './create_esql_tool_form';
import { OnechatCreateEsqlToolFormData } from '../../../../types';

const flyoutBodyClass = (euiTheme: EuiThemeComputed) =>
  css`
    position: relative;

    .euiFlyoutBody__overflow {
      transform: none; /* Remove the transform to avoid creating a new stacking context */
      mask-image: none; /* Remove the mask-image to avoid cutting off ES|QL suggestions */
    }

    /* Re-add the fade effect to the flyout body */
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

interface OnechatCreateEsqlToolFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: OnechatCreateEsqlToolFormData) => void;
}

const defaultValues: OnechatCreateEsqlToolFormData = {
  name: '',
  description: '',
  esql: '',
  tags: [],
  params: [],
};

export const OnechatCreateEsqlToolFlyout: React.FC<OnechatCreateEsqlToolFormProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const form = useForm<OnechatCreateEsqlToolFormData>({ defaultValues });
  const { reset, formState } = form;
  const { isDirty, isValid } = formState;
  const { euiTheme } = useEuiTheme();

  const newEsqlToolFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'newEsqlToolFlyoutTitle',
  });
  const newEsqlToolFormId = useGeneratedHtmlId({
    prefix: 'newEsqlToolForm',
  });

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen) {
    return null;
  }

  return (
    <FormProvider {...form}>
      <EuiFlyout onClose={onClose} aria-labelledby={newEsqlToolFlyoutTitleId} size="m">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={newEsqlToolFlyoutTitleId}>
              {i18n.translate('xpack.onechat.tools.newEsqlToolFlyoutTitle', {
                defaultMessage: 'New ES|QL tool',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody css={flyoutBodyClass(euiTheme)}>
          <OnechatEsqlToolForm formId={newEsqlToolFormId} onSave={onSave} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton onClick={() => reset()}>
                {i18n.translate('xpack.onechat.tools.newTool.clearButtonLabel', {
                  defaultMessage: 'Clear',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                type="submit"
                fill
                form={newEsqlToolFormId}
                disabled={!isDirty || !isValid}
              >
                {i18n.translate('xpack.onechat.tools.newTool.saveButtonLabel', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </FormProvider>
  );
};
