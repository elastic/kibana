/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiButtonIcon, EuiFormRow, EuiTextArea } from '@elastic/eui';
import type { EuiTextAreaProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  UseField,
  getFieldValidityAndErrorMessage,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { z } from '@kbn/zod/v4';
import { TextAreaField as FormTextAreaField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { BaseWidgetProps } from '../types';

type TextareaWidgetProps = BaseWidgetProps<z.ZodString, EuiTextAreaProps>;

const DEFAULT_ROWS = 6;

const SHOW_LABEL = i18n.translate('responseOpsFormGenerator.textareaWidget.showAriaLabel', {
  defaultMessage: 'Show secret',
});

const HIDE_LABEL = i18n.translate('responseOpsFormGenerator.textareaWidget.hideAriaLabel', {
  defaultMessage: 'Hide secret',
});

interface SensitiveTextareaFieldProps {
  field: FieldHook;
  euiFieldProps?: EuiTextAreaProps;
  idAria?: string;
  [key: string]: unknown;
}

/**
 * Renders a textarea that masks its contents by default and exposes a
 * show/hide toggle, mirroring the dual-mode behavior of EuiFieldPassword.
 *
 * Masking uses the `-webkit-text-security` CSS property, which is supported
 * in Chromium-based browsers, Safari, and Firefox 119+. Older Firefox falls
 * back to showing the value in the clear — acceptable for an admin-facing
 * connector config form, not a public-facing secret field.
 *
 * The property is applied imperatively via a ref because React/JSDOM filter
 * out non-standard CSS properties from inline style objects.
 */
const SensitiveTextareaField: React.FC<SensitiveTextareaFieldProps> = ({
  field,
  euiFieldProps,
  idAria,
  ...rest
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (isVisible) {
      el.style.removeProperty('-webkit-text-security');
      el.style.removeProperty('text-security');
    } else {
      el.style.setProperty('-webkit-text-security', 'disc');
      el.style.setProperty('text-security', 'disc');
    }
  }, [isVisible]);

  // Compose the internal ref (needed to imperatively apply the
  // -webkit-text-security masking style) with any caller-provided
  // `inputRef`, so spreading `euiFieldProps` can't silently drop either
  // side. Supports both callback and object refs, matching EUI's
  // `inputRef` contract.
  const { inputRef: callerInputRef, ...restEuiFieldProps } = euiFieldProps ?? {};
  const setInputRef = (el: HTMLTextAreaElement | null) => {
    textareaRef.current = el;
    if (typeof callerInputRef === 'function') {
      callerInputRef(el);
    } else if (callerInputRef && typeof callerInputRef === 'object') {
      (callerInputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    }
  };

  return (
    <EuiFormRow
      label={field.label}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      labelAppend={
        <EuiButtonIcon
          iconType={isVisible ? 'eyeClosed' : 'eye'}
          aria-label={isVisible ? HIDE_LABEL : SHOW_LABEL}
          onClick={() => setIsVisible((v) => !v)}
          data-test-subj="sensitiveTextareaToggle"
        />
      }
      {...rest}
    >
      <EuiTextArea
        {...restEuiFieldProps}
        inputRef={setInputRef}
        isInvalid={isInvalid}
        value={field.value as string}
        onChange={field.onChange}
        fullWidth
        rows={DEFAULT_ROWS}
        data-test-subj="input"
        data-is-masked={!isVisible}
      />
    </EuiFormRow>
  );
};

export const TextareaWidget: React.FC<TextareaWidgetProps> = ({
  path,
  schema,
  meta,
  fieldProps,
  fieldConfig,
}) => {
  const isSensitive = meta.getMeta(schema).sensitive === true;

  if (isSensitive) {
    return (
      <UseField
        path={path}
        component={SensitiveTextareaField}
        config={fieldConfig}
        componentProps={fieldProps}
      />
    );
  }

  return (
    <UseField
      path={path}
      component={FormTextAreaField}
      config={fieldConfig}
      componentProps={{
        ...fieldProps,
        euiFieldProps: {
          rows: DEFAULT_ROWS,
          ...fieldProps?.euiFieldProps,
        },
      }}
    />
  );
};
