/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow, EuiText } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import deepEqual from 'fast-deep-equal';
import type { PlatformId } from '../queries/platforms';
import { OS_OPTIONS, isPlatformId } from '../queries/platforms';

interface PackPlatformFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

/**
 * Pack-level operating-systems default.
 *
 * This is a *default that fans out onto inheriting queries*, not a pack gate:
 * Kibana never writes osquery's native `Pack.Platform` (an init-time gate that
 * would skip the entire pack). The value is expanded onto each query that does
 * not set its own `platform`, so a per-query value always wins and a mismatch
 * only ever skips that one query.
 *
 * Unlike the per-query {@link PlatformCheckBoxGroupField} this field is
 * optional — an empty value simply means "no pack default", leaving each query
 * to its own platform.
 */
const PackPlatformFieldComponent: React.FC<PackPlatformFieldProps> = ({ euiFieldProps = {} }) => {
  const { isDisabled, ...restEuiFieldProps } = euiFieldProps;

  const {
    field: { onChange, value },
  } = useController<{ platform: string }>({
    name: 'platform',
    defaultValue: '',
  });

  const selectedOptions = useMemo(() => {
    if (typeof value !== 'string' || value.length === 0) {
      return [];
    }

    const ids = value
      .split(',')
      .map((token) => token.trim())
      .filter((token): token is PlatformId => isPlatformId(token));

    // `OS_OPTIONS` entries are keyed by `key`, not `value` (EuiComboBox
    // treats the whole option object as opaque here).
    return OS_OPTIONS.filter((option) => ids.includes(option.key));
  }, [value]);

  const handleChange = useCallback(
    (newOptions: Array<EuiComboBoxOptionOption<string>>) => {
      onChange(newOptions.map((option) => option.key).join(','));
    },
    [onChange]
  );

  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.osquery.pack.form.packPlatformFieldLabel"
          defaultMessage="Operating systems"
        />
      }
      labelAppend={
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.osquery.pack.form.packPlatformFieldOptionalLabel"
            defaultMessage="optional"
          />
        </EuiText>
      }
      fullWidth
    >
      <EuiComboBox
        data-test-subj="pack-platform-field"
        options={OS_OPTIONS}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        isDisabled={!!isDisabled}
        placeholder={i18n.translate('xpack.osquery.pack.form.packPlatformFieldPlaceholder', {
          defaultMessage: 'All',
        })}
        fullWidth
        isClearable
        {...restEuiFieldProps}
      />
    </EuiFormRow>
  );
};

export const PackPlatformField = React.memo(PackPlatformFieldComponent, deepEqual);
