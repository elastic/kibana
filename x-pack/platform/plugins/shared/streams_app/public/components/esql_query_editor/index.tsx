/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ESQLEditorProps } from '@kbn/esql/public';
import { ESQLLangEditor } from '@kbn/esql/public';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty, memoize } from 'lodash';
import { normalizeEsqlQuery } from '@kbn/streams-schema';

export const StreamsESQLEditor = ({
  prefix,
  errors = [],
  ...props
}: ESQLEditorProps & { prefix?: string }) => {
  const prefixValidation = validatePrefix(props.query.esql, prefix);

  const allErrors = prefixValidation.isValid ? errors : [...errors, prefixValidation.error];

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.esqlQueryEditor.label', {
        defaultMessage: 'ES|QL Query',
      })}
      data-test-subj="streamsEsqlEditor"
      fullWidth
      isInvalid={!isEmpty(allErrors)}
    >
      <ESQLLangEditor
        disableAutoFocus
        editorIsInline
        expandToFitQueryOnMount
        hasOutline
        hideRunQueryButton
        mergeExternalMessages
        errors={allErrors}
        {...props}
      />
    </EuiFormRow>
  );
};

// As the normalization is a heavy operation, we memoize it to avoid re-calculating it on every render for static prefixes.
const memoizedNormalizeEsqlQuery = memoize(normalizeEsqlQuery);

export function validatePrefix(value: string, prefix?: string) {
  const normalizedValue = memoizedNormalizeEsqlQuery(value);
  const normalizedPrefix = prefix ? memoizedNormalizeEsqlQuery(prefix) : undefined;
  if (!normalizedPrefix || normalizedValue.startsWith(normalizedPrefix)) {
    return { isValid: true, error: undefined } as const;
  }

  return {
    isValid: false,
    error: new Error(
      i18n.translate('xpack.streams.esqlQueryEditor.formFieldQueryPrefixError', {
        defaultMessage: 'The query must start with "{prefix}"',
        values: { prefix },
      })
    ),
  } as const;
}
