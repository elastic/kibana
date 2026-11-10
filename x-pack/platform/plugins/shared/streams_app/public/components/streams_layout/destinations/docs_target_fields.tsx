/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox, EuiFieldText, EuiFormRow, type EuiFieldTextProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { writeTargetErrorText } from './write_target_error_text';
import type { DestinationCreationFormErrors } from './types';

const DOCS_INDEX_PLACEHOLDER = i18n.translate(
  'xpack.streams.destinations.docsIndexExamplePlaceholder',
  { defaultMessage: 'e.g. accounting-2026' }
);

const DOCS_WRITE_PATTERN_PLACEHOLDER = i18n.translate(
  'xpack.streams.destinations.docsWritePatternExamplePlaceholder',
  { defaultMessage: 'e.g. logs-orders-*' }
);

const DOCS_PREFIX_HELP = i18n.translate('xpack.streams.destinations.docsWritePatternsHelpText', {
  defaultMessage: 'Must start with logs-, metrics- or traces-.',
});

export const DocsIndexField = ({
  value,
  error,
  disabled,
  onChange,
  onBlur,
  prepend,
}: {
  value: string;
  error: DestinationCreationFormErrors['docsIndex'];
  disabled: boolean;
  onChange: (index: string) => void;
  onBlur: () => void;
  prepend?: EuiFieldTextProps['prepend'];
}) => {
  const errorText = writeTargetErrorText('docs', error, false);
  return (
    <EuiFormRow
      fullWidth
      helpText={i18n.translate('xpack.streams.destinations.docsIndexHelpText', {
        defaultMessage:
          "Any index or data stream name. It is used as entered, with no signal prefix added. It replaces each request's _index, which must still start with logs-, metrics- or traces-. Leave blank to not send documents.",
      })}
      isInvalid={Boolean(errorText)}
      error={errorText}
    >
      <EuiFieldText
        fullWidth
        value={value}
        disabled={disabled}
        isInvalid={Boolean(errorText)}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        prepend={prepend}
        aria-label={i18n.translate('xpack.streams.destinations.docsIndexLabel', {
          defaultMessage: 'Documents index',
        })}
        placeholder={DOCS_INDEX_PLACEHOLDER}
        data-test-subj="streamsCreateDestination-docs-index"
      />
    </EuiFormRow>
  );
};

export const DocsWritePatternsField = ({
  value,
  getValue,
  error,
  disabled,
  onChange,
  onBlur,
}: {
  value: string[];
  getValue: () => string[];
  error: DestinationCreationFormErrors['docsWritePatterns'];
  disabled: boolean;
  onChange: (patterns: string[]) => void;
  onBlur: () => void;
}) => {
  const entryErrors = Array.isArray(error) ? error : [];
  const invalidPatterns = new Set(entryErrors.map(({ pattern }) => pattern));
  const errorLines =
    error === 'required' || error === 'tooMany'
      ? [writeTargetErrorText('docs', error, true)]
      : entryErrors.map(({ pattern, error: entryError }) =>
          i18n.translate('xpack.streams.destinations.docsWritePatternEntryErrorMessage', {
            defaultMessage: '{pattern}: {message}',
            values: { pattern, message: writeTargetErrorText('docs', entryError, true) },
          })
        );
  // Multi-select EuiComboBox ignores `prepend`, so this row keeps a visible label.
  const label = i18n.translate('xpack.streams.destinations.docsSignalRowLabel', {
    defaultMessage: 'Documents',
  });

  return (
    <EuiFormRow
      fullWidth
      label={label}
      helpText={DOCS_PREFIX_HELP}
      isInvalid={errorLines.length > 0}
      error={errorLines}
    >
      <EuiComboBox
        fullWidth
        noSuggestions
        // Index names are case sensitive, so lowercasing an uppercase pill makes a new entry.
        isCaseSensitive
        delimiter=","
        aria-label={label}
        placeholder={DOCS_WRITE_PATTERN_PLACEHOLDER}
        isDisabled={disabled}
        isInvalid={errorLines.length > 0}
        selectedOptions={value.map((pattern) => ({
          key: pattern,
          label: pattern,
          color: invalidPatterns.has(pattern) ? 'danger' : undefined,
        }))}
        onCreateOption={(searchValue) => {
          const pattern = searchValue.trim();
          // A delimited paste calls this once per token before a re-render, so `value` is stale.
          const current = getValue();
          if (pattern && !current.includes(pattern)) {
            onChange([...current, pattern]);
            // Mark touched so a new pill shows its error right away.
            onBlur();
          }
        }}
        onChange={(options) => {
          onChange(options.map(({ label: pattern }) => pattern));
          onBlur();
        }}
        onBlur={onBlur}
        data-test-subj="streamsCreateDestination-docs-writePatterns"
      />
    </EuiFormRow>
  );
};
