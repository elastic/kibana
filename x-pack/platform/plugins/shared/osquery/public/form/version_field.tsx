/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiComboBox, EuiText } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';
import { isValidOsqueryVersion } from '../../common/utils/osquery_version';

const INVALID_FORMAT_ERROR = i18n.translate('xpack.osquery.versionField.invalidFormatError', {
  defaultMessage: 'Version must be a numeric string, e.g. "5.19.0".',
});

interface VersionFieldProps {
  euiFieldProps?: Record<string, unknown>;
  /** react-hook-form field name. Defaults to `version` (per-query). Pack defaults use `min_osquery_version`. */
  name?: string;
  /** Optional help text rendered below the field. */
  helpText?: React.ReactNode;
  /**
   * Skip the stored-value format check. Set when the field shows an inherited
   * pack default that the serializer drops on save, so an invalid legacy pack
   * value must not block submitting the query.
   */
  skipValidation?: boolean;
}

const VersionFieldComponent = ({
  euiFieldProps = {},
  name = 'version',
  helpText,
  skipValidation = false,
}: VersionFieldProps) => {
  const [createError, setCreateError] = useState<string | null>(null);
  const isSingleSelection = !!euiFieldProps.singleSelection;

  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name,
    defaultValue: [],
    rules: {
      validate: (v: string[]) => {
        if (skipValidation || !Array.isArray(v) || v.length === 0) return true;
        const invalid = v.find((entry) => !isValidOsqueryVersion(entry));

        return invalid
          ? i18n.translate('xpack.osquery.versionField.storedInvalidFormatError', {
              defaultMessage: 'Stored version "{version}" is not a valid format.',
              values: { version: invalid },
            })
          : true;
      },
    },
  });

  const onCreateComboOption = useCallback(
    (newValue: string) => {
      const trimmed = newValue.trim();
      if (!isValidOsqueryVersion(trimmed)) {
        setCreateError(INVALID_FORMAT_ERROR);

        return false;
      }

      setCreateError(null);
      onChange(isSingleSelection ? [trimmed] : [...(value as string[]), trimmed]);

      return true;
    },
    [onChange, value, isSingleSelection]
  );

  const onComboChange = useCallback(
    (options: EuiComboBoxOptionOption[]) => {
      setCreateError(null);
      onChange(options.map((option) => option.label));
    },
    [onChange]
  );

  const displayError = skipValidation ? undefined : createError ?? error?.message;
  const hasError = useMemo(() => !!displayError, [displayError]);

  const selectedOptions = useMemo(
    () => (Array.isArray(value) ? value.map((v: string) => ({ label: v })) : []),
    [value]
  );

  return (
    <EuiFormRow
      data-test-subj="version-field-row"
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
      helpText={helpText}
      error={displayError}
      isInvalid={hasError}
      fullWidth
    >
      <EuiComboBox
        isInvalid={hasError}
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
