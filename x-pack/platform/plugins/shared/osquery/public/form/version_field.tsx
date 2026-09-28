/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiComboBox, EuiText } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';

interface VersionFieldProps {
  euiFieldProps?: Record<string, unknown>;
  /** react-hook-form field name. Defaults to `version` (per-query). Pack defaults use `min_osquery_version`. */
  name?: string;
}

const VersionFieldComponent = ({ euiFieldProps = {}, name = 'version' }: VersionFieldProps) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name,
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
  const selectedOptions = useMemo(
    () => (Array.isArray(value) ? value.map((v: string) => ({ label: v })) : []),
    [value]
  );

  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.osquery.pack.queryFlyoutForm.minOsqueryVersionLabel"
          defaultMessage="Minimum osquery version"
        />
      }
      labelAppend={
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.osquery.queryFlyoutForm.versionOptionalLabel"
            defaultMessage="optional"
          />
        </EuiText>
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
        selectedOptions={selectedOptions}
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
