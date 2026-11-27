/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useController } from 'react-hook-form';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ShardsFormReturn } from './shards_form';

interface ShardsPolicyFieldComponent {
  index: number;
  control: ShardsFormReturn['control'];
  euiFieldProps?: Record<string, unknown>;
  hideLabel?: boolean;
  options: Array<EuiComboBoxOptionOption<string>>;
}

const ShardsPolicyFieldComponent = ({
  index,
  control,
  euiFieldProps,
  hideLabel,
  options,
}: ShardsPolicyFieldComponent) => {
  const missingValueError = i18n.translate(
    'xpack.osquery.pack.form.shardsPolicyFieldMissingErrorMessage',
    {
      defaultMessage: 'Policy is a required field',
    }
  );

  const policyFieldValidator = useCallback(
    (policy: { key: string; label: string }) => (!policy ? missingValueError : undefined),

    [missingValueError]
  );

  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    control,
    name: `shardsArray.${index}.policy`,
    rules: {
      validate: policyFieldValidator,
      required: missingValueError,
    },
  });

  const hasError = useMemo(() => !!value?.key && !!error?.message, [value?.key, error?.message]);

  const [selectedOptions, setSelected] = useState<EuiComboBoxOptionOption[]>([]);
  const handleChange = useCallback(
    (newSelectedOptions: EuiComboBoxOptionOption[]) => {
      setSelected(newSelectedOptions);
      onChange(newSelectedOptions[0]);
    },
    [onChange]
  );

  useEffect(() => {
    // Fall back to the key so a deleted policy (or a row converted before the
    // policy list loaded) still shows a selection instead of an empty combobox.
    setSelected(
      value?.key ? [{ ...value, label: value.label || value.key, value: value.key }] : []
    );
  }, [value]);

  const singleSelectionConfig = useMemo(() => ({ asPlainText: true }), []);

  return (
    <EuiFormRow
      label={
        hideLabel
          ? ''
          : i18n.translate('xpack.osquery.pack.form.policyFieldLabel', {
              defaultMessage: 'Policy',
            })
      }
      error={hasError ? error?.message : undefined}
      isInvalid={hasError}
      fullWidth
    >
      <EuiComboBox
        fullWidth
        singleSelection={singleSelectionConfig}
        isInvalid={hasError}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        data-test-subj="shards-field-policy"
        rowHeight={32}
        isClearable
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export const ShardsPolicyField = React.memo(ShardsPolicyFieldComponent);
