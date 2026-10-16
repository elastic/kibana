/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiComboBox, EuiText } from '@elastic/eui';
import { useController, useFormContext } from 'react-hook-form';
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
   * Skip the stored-value format check. Set when the field holds the pack
   * default that the serializer drops on save, so an invalid legacy pack value
   * must not block submitting the query. Typed input is still checked.
   */
  skipValidation?: boolean;
}

const VersionFieldComponent = ({
  euiFieldProps = {},
  name = 'version',
  helpText,
  skipValidation = false,
}: VersionFieldProps) => {
  const [createError, setCreateErrorState] = useState<string | null>(null);
  // Read by `validate`, so a rejected typed value blocks submit even when the
  // blur that rejected it and the Save click land before a re-render.
  const createErrorRef = useRef<string | null>(null);
  const setCreateError = useCallback((next: string | null) => {
    createErrorRef.current = next;
    setCreateErrorState(next);
  }, []);
  const isSingleSelection = !!euiFieldProps.singleSelection;
  const isDisabled = !!euiFieldProps.isDisabled;
  const { trigger } = useFormContext();

  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name,
    defaultValue: [],
    rules: {
      validate: (v: string[]) => {
        // The typed value was rejected, so the form value still holds the previous
        // selection. Block submit until the input is fixed or cleared. A disabled
        // field can't be edited, so its leftover text must not block.
        if (createErrorRef.current && !isDisabled) return createErrorRef.current;
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
    [onChange, value, isSingleSelection, setCreateError]
  );

  const onComboChange = useCallback(
    (options: EuiComboBoxOptionOption[]) => {
      setCreateError(null);
      onChange(options.map((option) => option.label));
    },
    [onChange, setCreateError]
  );

  // Editing the rejected text clears its error; EUI re-runs `onCreateOption`
  // on Enter or blur, which flags the new text if it is still invalid. After a
  // blocked submit the form state still holds that error, so re-validate.
  const onSearchChange = useCallback(() => {
    if (!createErrorRef.current) return;
    setCreateError(null);
    if (error) trigger(name);
  }, [setCreateError, error, trigger, name]);

  // Disabling the field (e.g. the flyout's override toggle turned off) drops any
  // pending rejection, along with the submit error it produced.
  useEffect(() => {
    if (!isDisabled || !createErrorRef.current) return;
    setCreateError(null);
    if (error) trigger(name);
  }, [isDisabled, error, setCreateError, trigger, name]);

  const displayError = createError ?? (skipValidation ? undefined : error?.message);
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
        onSearchChange={onSearchChange}
        fullWidth
        data-test-subj="input"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export const VersionField = React.memo(VersionFieldComponent, deepEqual);
