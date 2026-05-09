/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { useController } from 'react-hook-form';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { parseXJsonOrString, serializeXJson } from '../../../../helpers';
import type { ProcessorFormState } from '../../../../types';

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
        onChange={(value) => field.onChange(parseXJsonOrString(value))}
        languageId="xjson"
        height={200}
        dataTestSubj="streamsAppPatternDefinitionsEditor"
        options={{ automaticLayout: true }}
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokPatternDefinitionsAriaLabel',
          { defaultMessage: 'Pattern definitions editor' }
        )}
      />
    </EuiFormRow>
  );
};
