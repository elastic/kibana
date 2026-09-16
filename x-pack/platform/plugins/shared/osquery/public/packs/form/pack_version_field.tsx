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
import { ALL_OSQUERY_VERSIONS_OPTIONS } from '../queries/constants';

const SINGLE_SELECTION = { asPlainText: true };

interface PackVersionFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const PackVersionFieldComponent = ({ euiFieldProps = {} }: PackVersionFieldProps) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name: 'min_osquery_version',
    defaultValue: [],
  });

  const onComboChange = useCallback(
    (options: EuiComboBoxOptionOption[]) => {
      onChange(options.map((option) => option.label));
    },
    [onChange]
  );

  const selectedOptions = useMemo(
    () => (Array.isArray(value) ? value.map((v: string) => ({ label: v })) : []),
    [value]
  );

  const hasError = useMemo(() => !!error?.message, [error?.message]);

  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.osquery.pack.form.packVersionFieldLabel"
          defaultMessage="Minimum osquery version"
        />
      }
      labelAppend={
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.osquery.pack.form.packVersionFieldOptionalLabel"
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
        noSuggestions={false}
        singleSelection={SINGLE_SELECTION}
        placeholder={i18n.translate('xpack.osquery.pack.form.packVersionFieldPlaceholder', {
          defaultMessage: 'All',
        })}
        options={ALL_OSQUERY_VERSIONS_OPTIONS}
        selectedOptions={selectedOptions}
        // No free-text entry, matching the per-query version field (which the
        // query flyout deliberately passes `onCreateOption: undefined` for).
        // The API schema is a bare string with no semver validation, so an
        // arbitrary value like `latest` would persist here and then fan out
        // onto every inheriting query's `version` on the Fleet wire, where
        // osquery's version comparison cannot interpret it.
        onCreateOption={undefined}
        onChange={onComboChange}
        fullWidth
        data-test-subj="pack-version-field"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export const PackVersionField = React.memo(PackVersionFieldComponent, deepEqual);
