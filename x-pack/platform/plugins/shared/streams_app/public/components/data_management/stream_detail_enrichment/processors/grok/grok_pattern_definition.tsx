/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import { EuiFormRow } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { ProcessorFormState } from '../../types';

export const GrokPatternDefinition = () => {
  const { field, fieldState } = useController<ProcessorFormState, 'pattern_definitions'>({
    name: 'pattern_definitions',
  });

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokPatternDefinitionsLabel',
        { defaultMessage: 'Pattern definitions' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokPatternDefinitionsHelpText',
        {
          defaultMessage:
            'A map of pattern-name and pattern tuples defining custom patterns. Patterns matching existing names will override the pre-existing definition.',
        }
      )}
      isInvalid={fieldState.invalid}
      fullWidth
    >
      <CodeEditor
        value={serialize(field.value)}
        onChange={(value) => field.onChange(deserialize(value))}
        languageId="xjson"
        height={200}
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokPatternDefinitionsAriaLabel',
          { defaultMessage: 'Pattern definitions editor' }
        )}
      />
    </EuiFormRow>
  );
};

const serialize = (v: unknown) => {
  if (!v) {
    return '{}';
  }
  if (typeof v === 'string') {
    return formatXJsonString(v);
  }
  return JSON.stringify(v, null, 2);
};

const deserialize = (input: string) => {
  try {
    return JSON.parse(input);
  } catch (e) {
    return input;
  }
};

/**
 * Format a XJson string input as parsed JSON. Replaces the invalid characters
 *  with a placeholder, parses the new string in a JSON format with the expected
 * indentantion and then replaces the placeholders with the original values.
 */
const formatXJsonString = (input: string) => {
  let placeholder = 'PLACEHOLDER';
  const INVALID_STRING_REGEX = /"""(.*?)"""/gs;
  while (input.includes(placeholder)) {
    placeholder += '_';
  }
  const modifiedInput = input.replace(INVALID_STRING_REGEX, () => `"${placeholder}"`);

  let jsonObject;
  try {
    jsonObject = JSON.parse(modifiedInput);
  } catch (error) {
    return input;
  }
  let formattedJsonString = JSON.stringify(jsonObject, null, 2);
  const invalidStrings = input.match(INVALID_STRING_REGEX);
  if (invalidStrings) {
    invalidStrings.forEach((invalidString) => {
      formattedJsonString = formattedJsonString.replace(`"${placeholder}"`, invalidString);
    });
  }
  return formattedJsonString;
};
