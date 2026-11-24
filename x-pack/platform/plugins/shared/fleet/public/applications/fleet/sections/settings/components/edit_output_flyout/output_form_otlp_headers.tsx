/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { OutputFormInputsType } from './use_output_form';

type HeadersErrors = Array<{
  message: string;
  index: number;
  hasKeyError: boolean;
  hasValueError: boolean;
}>;

export const OtlpHeaders: React.FunctionComponent<{ inputs: OutputFormInputsType }> = ({
  inputs,
}) => {
  const {
    props: { onChange, disabled },
    value: rows,
    formRowProps: { error },
  } = inputs.otlpHeadersInput;
  const errors = error as HeadersErrors | undefined;
  const deleteHeaderLabel = i18n.translate(
    'xpack.fleet.settings.editOutputFlyout.otlpHeaderDeleteAriaLabel',
    { defaultMessage: 'Delete header' }
  );

  const updateRow = useCallback(
    (index: number, field: 'key' | 'value', value: string) => {
      onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    },
    [rows, onChange]
  );

  return (
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpHeadersLabel"
          defaultMessage="Headers (optional)"
        />
      }
      helpText={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.otlpHeadersHelpText"
          defaultMessage="Name/value pairs added to every request. Default: none."
        />
      }
    >
      <>
        {rows.map((row, index) => {
          const rowErrors = errors?.filter((e) => e.index === index) ?? [];
          return (
            <React.Fragment key={index}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiFieldText
                    compressed
                    fullWidth
                    disabled={disabled}
                    isInvalid={rowErrors.some((e) => e.hasKeyError)}
                    value={row.key}
                    onChange={(e) => updateRow(index, 'key', e.target.value)}
                    onBlur={() => inputs.otlpHeadersInput.validate()}
                    aria-label={i18n.translate(
                      'xpack.fleet.settings.editOutputFlyout.otlpHeaderNameAriaLabel',
                      { defaultMessage: 'Header name' }
                    )}
                    placeholder={i18n.translate(
                      'xpack.fleet.settings.editOutputFlyout.otlpHeaderNamePlaceholder',
                      { defaultMessage: 'Name' }
                    )}
                    data-test-subj={`settingsOutputsFlyout.otlpHeaderName${index}`}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFieldText
                    compressed
                    fullWidth
                    disabled={disabled}
                    isInvalid={rowErrors.some((e) => e.hasValueError)}
                    value={row.value}
                    onChange={(e) => updateRow(index, 'value', e.target.value)}
                    onBlur={() => inputs.otlpHeadersInput.validate()}
                    aria-label={i18n.translate(
                      'xpack.fleet.settings.editOutputFlyout.otlpHeaderValueAriaLabel',
                      { defaultMessage: 'Header value' }
                    )}
                    placeholder={i18n.translate(
                      'xpack.fleet.settings.editOutputFlyout.otlpHeaderValuePlaceholder',
                      { defaultMessage: 'Value' }
                    )}
                    data-test-subj={`settingsOutputsFlyout.otlpHeaderValue${index}`}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={deleteHeaderLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="trash"
                      color="danger"
                      isDisabled={disabled || rows.length === 1}
                      onClick={() => onChange(rows.filter((_, i) => i !== index))}
                      aria-label={deleteHeaderLabel}
                      data-test-subj={`settingsOutputsFlyout.otlpHeaderDelete${index}`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
              {rowErrors.map(({ message }) => (
                <EuiFormErrorText key={message}>{message}</EuiFormErrorText>
              ))}
              <EuiSpacer size="xs" />
            </React.Fragment>
          );
        })}
        <EuiButtonEmpty
          size="xs"
          iconType="plusCircle"
          isDisabled={disabled}
          onClick={() => onChange([...rows, { key: '', value: '' }])}
          data-test-subj="settingsOutputsFlyout.otlpAddHeader"
        >
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.otlpAddHeader"
            defaultMessage="Add header"
          />
        </EuiButtonEmpty>
      </>
    </EuiFormRow>
  );
};
