/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import { ProcessorFormState } from '../../types';

export const OTTLPatternDefinition = () => {
  const { field, fieldState } = useController<ProcessorFormState, 'statement'>({
    name: 'statement',
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectPatternRequiredError',
        { defaultMessage: 'A statement is required.' }
      ),
    },
  });

  const { invalid, error } = fieldState;

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.statementLabel',
        { defaultMessage: 'Statement' }
      )}
      isInvalid={invalid}
      error={error?.message}
      fullWidth
    >
      <CodeEditor
        value={field.value}
        onChange={(v) => field.onChange(v)}
        languageId="text"
        height={75}
        options={{ minimap: { enabled: false } }}
      />
    </EuiFormRow>
  );
};
