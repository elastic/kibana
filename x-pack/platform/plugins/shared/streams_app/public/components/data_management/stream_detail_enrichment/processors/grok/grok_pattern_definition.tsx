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
import { deserializeJson, serializeXJson } from '../../helpers';

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
        value={serializeXJson(field.value)}
        onChange={(value) => field.onChange(deserializeJson(value))}
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
