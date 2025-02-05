/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FIELD_TYPES,
  UseField,
  UseArray,
  ToggleField,
  fieldValidators,
  ValidationFunc,
  ArrayItem,
} from '../../../../../../shared_imports';

import { DragAndDropTextList, XJsonEditor } from '../field_components';

import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldsConfig, to, from, EDITOR_PX_HEIGHT, isXJsonField } from './shared';

const { emptyField } = fieldValidators;

const i18nTexts = {
  addPatternLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.grokForm.patternsAddPatternLabel',
    { defaultMessage: 'Add pattern' }
  ),
};

const valueRequiredMessage = i18n.translate(
  'xpack.ingestPipelines.pipelineEditor.grokForm.patternsValueRequiredError',
  { defaultMessage: 'A value is required.' }
);

const patternsValidation: ValidationFunc<any, string, ArrayItem[]> = ({ value, formData }) => {
  if (value.length === 0) {
    return {
      message: valueRequiredMessage,
    };
  }
};

const patternValidations: Array<ValidationFunc<any, string, string>> = [
  emptyField(valueRequiredMessage),
];

const fieldsConfig: FieldsConfig = {
  /* Required field configs */
  patterns: {
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.grokForm.patternsFieldLabel', {
      defaultMessage: 'Patterns',
    }),
    deserializer: String,
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.grokForm.patternsHelpText', {
      defaultMessage:
        'Grok expressions used to match and extract named capture groups. Uses the first matching expression.',
    }),
    validations: [
      {
        validator: patternsValidation as ValidationFunc,
      },
    ],
  },
  /* Optional field configs */
  pattern_definitions: {
    type: FIELD_TYPES.TEXT,
    deserializer: to.xJsonString,
    serializer: from.optionalXJson,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.grokForm.patternDefinitionsLabel', {
      defaultMessage: 'Pattern definitions (optional)',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.grokForm.patternDefinitionsHelpText',
      {
        defaultMessage:
          'A map of pattern-name and pattern tuples defining custom patterns. Patterns matching existing names will override the pre-existing definition.',
      }
    ),
    validations: [
      {
        validator: isXJsonField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.grokForm.patternsDefinitionsInvalidJSONError',
            { defaultMessage: 'Invalid JSON' }
          ),
          {
            allowEmptyString: true,
          }
        ),
      },
    ],
  },

  trace_match: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(false),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.grokForm.traceMatchFieldLabel', {
      defaultMessage: 'Trace match',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.grokForm.traceMatchFieldHelpText',
      {
        defaultMessage: 'Add metadata about the matching expression to the document.',
      }
    ),
  },
};

export const Grok: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.grokForm.fieldNameHelpText',
          { defaultMessage: 'Field to search for matches.' }
        )}
      />

      <UseArray path="fields.patterns" validations={fieldsConfig.patterns.validations}>
        {({ items, addItem, removeItem, moveItem, error }) => {
          return (
            <DragAndDropTextList
              label={fieldsConfig.patterns.label!}
              helpText={
                typeof fieldsConfig.patterns.helpText === 'function'
                  ? fieldsConfig.patterns.helpText()
                  : fieldsConfig.patterns.helpText
              }
              error={error}
              value={items}
              onMove={moveItem}
              onAdd={addItem}
              onRemove={removeItem}
              addLabel={i18nTexts.addPatternLabel}
              textValidations={patternValidations}
              textDeserializer={fieldsConfig.patterns?.deserializer}
              textSerializer={fieldsConfig.patterns?.serializer}
            />
          );
        }}
      </UseArray>

      <UseField
        component={XJsonEditor}
        config={fieldsConfig.pattern_definitions}
        componentProps={{
          editorProps: {
            'data-test-subj': 'patternDefinitionsField',
            height: EDITOR_PX_HEIGHT.medium,
            'aria-label': i18n.translate(
              'xpack.ingestPipelines.pipelineEditor.grokForm.patternDefinitionsAriaLabel',
              {
                defaultMessage: 'Pattern definitions editor',
              }
            ),
          },
        }}
        path="fields.pattern_definitions"
        data-test-subj="patternDefinitions"
      />

      <UseField
        component={ToggleField}
        config={fieldsConfig.trace_match}
        path="fields.trace_match"
      />

      <IgnoreMissingField />
    </>
  );
};
