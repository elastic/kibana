/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';

interface VersionFieldProps {
  euiFieldProps?: Record<string, unknown>;
}
const VersionFieldComponent = ({ euiFieldProps = {} }: VersionFieldProps) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name: 'version',
    defaultValue: [],
    rules: {},
  });

  const onCreateComboOption = useCallback(
    (newValue: string) => {
      const result = [...(value as string[]), newValue];

      onChange(result);
    },
    [onChange, value]
  );

  const onComboChange = useCallback(
    (options: EuiComboBoxOptionOption[]) => {
      onChange(options.map((option) => option.label));
    },
    [onChange]
  );
  const hasError = useMemo(() => !!error?.message, [error?.message]);

  return (
    <EuiFormRow
      label={
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.osquery.pack.queryFlyoutForm.versionFieldLabel"
              defaultMessage="Minimum Osquery version"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      labelAppend={
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.osquery.queryFlyoutForm.versionFieldOptionalLabel"
              defaultMessage="(optional)"
            />
          </EuiText>
        </EuiFlexItem>
      }
      error={error?.message}
      isInvalid={hasError}
      fullWidth
    >
      <EuiComboBox
        isInvalid={hasError}
        noSuggestions
        placeholder={i18n.translate('xpack.osquery.comboBoxField.placeHolderText', {
          defaultMessage: 'Type and then hit "ENTER"',
        })}
        selectedOptions={value.map((v: string) => ({ label: v }))}
        onCreateOption={onCreateComboOption}
        onChange={onComboChange}
        fullWidth
        data-test-subj="input"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export const VersionField = React.memo(VersionFieldComponent, deepEqual);
