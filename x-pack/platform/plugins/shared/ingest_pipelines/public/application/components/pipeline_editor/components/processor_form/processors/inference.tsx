/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiFormRow, EuiLink, EuiSpacer, EuiSwitch } from '@elastic/eui';

import {
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  useKibana,
  useFormContext,
} from '../../../../../../shared_imports';

import { TargetField } from './common_fields/target_field';

import type { FieldsConfig, FormFieldsComponent } from './shared';
import { to, from, EDITOR_PX_HEIGHT, isXJsonField } from './shared';
import { XJsonEditor } from '../field_components';
import { collapseEscapedStrings } from '../../../utils';

const { emptyField } = fieldValidators;

const INFERENCE_CONFIG_DOCS = {
  documentation: {
    linkLabel: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.inferenceForm.inferenceConfigField.documentationLinkLabel',
      { defaultMessage: 'documentation' }
    ),
  },
};

function getInferenceConfigHelpText(documentationDocsLink: string): ReactNode {
  return (
    <FormattedMessage
      id="xpack.ingestPipelines.pipelineEditor.inferenceForm.inferenceConfigurationHelpText"
      defaultMessage="Contains the inference type and its options. Refer to the {documentation} for the available configuration options."
      values={{
        documentation: (
          <EuiLink external target="_blank" href={documentationDocsLink}>
            {INFERENCE_CONFIG_DOCS.documentation.linkLabel}
          </EuiLink>
        ),
      }}
    />
  );
}

const deserializeXJsonWithDefault =
  (defaultValue: string) =>
  (v: unknown): string => {
    if (!v) {
      return defaultValue;
    }
    if (typeof v === 'string') {
      return v;
    }
    return JSON.stringify(v, null, 2);
  };

const isInputOutputArrayField =
  (message: string) =>
  ({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return;
    }

    const trimmed = collapseEscapedStrings(value).trim();
    if (!trimmed || trimmed === '[]') {
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return { message };
      }
    } catch {
      // Invalid JSON is handled by the isXJsonField validator.
    }
  };

const isFieldMapObjectField =
  (message: string) =>
  ({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return;
    }

    const trimmed = collapseEscapedStrings(value).trim();
    if (!trimmed || trimmed === '{}') {
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { message };
      }
    } catch {
      // Invalid JSON is handled by the isXJsonField validator.
    }
  };

const mappingModeToggleLabel = i18n.translate(
  'xpack.ingestPipelines.pipelineEditor.inferenceForm.inputMappingModeLabel',
  {
    defaultMessage: 'Use target field and field map instead of input/output',
  }
);

const mappingModeToggleHelpText = (
  <FormattedMessage
    id="xpack.ingestPipelines.pipelineEditor.inferenceForm.inputMappingModeHelpText"
    defaultMessage="Use {inputOutput} for NLP inference endpoints. Use {targetFieldAndFieldMap} for data frame analytics models."
    values={{
      inputOutput: <EuiCode>{'input_output'}</EuiCode>,
      targetFieldAndFieldMap: (
        <>
          <EuiCode>{'target_field'}</EuiCode>
          {' + '}
          <EuiCode>{'field_map'}</EuiCode>
        </>
      ),
    }}
  />
);

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  model_id: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.inferenceForm.modelIDFieldLabel', {
      defaultMessage: 'Deployment, inference, or model ID',
    }),
    deserializer: String,
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.inferenceForm.modelIDFieldHelpText',
      {
        defaultMessage:
          'ID of the deployment, the inference endpoint, or the model to infer against.',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.inferenceForm.patternRequiredError',
            {
              defaultMessage: 'A deployment, an inference, or a model ID value is required.',
            }
          )
        ),
      },
    ],
  },

  /* Optional fields config */
  input_output: {
    type: FIELD_TYPES.TEXT,
    // Default to an empty array literal for the editor.
    deserializer: deserializeXJsonWithDefault('[]'),
    serializer: from.optionalXJsonArray,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.inferenceForm.inputOutputLabel', {
      defaultMessage: 'Input/output fields (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.inferenceForm.inputOutputHelpText"
        defaultMessage="List of input fields and output (destination) fields for inference results. Inference endpoints require {inputOutput}."
        values={{
          inputOutput: <EuiCode>{'input_output'}</EuiCode>,
        }}
      />
    ),
    validations: [
      {
        validator: isXJsonField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.inferenceForm.inputOutputInvalidJSONError',
            { defaultMessage: 'Invalid JSON' }
          ),
          {
            allowEmptyString: true,
          }
        ),
      },
      {
        validator: isInputOutputArrayField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.inferenceForm.inputOutputArrayError',
            {
              defaultMessage: 'Input/output must be a JSON array.',
            }
          )
        ),
      },
    ],
  },
  field_map: {
    type: FIELD_TYPES.TEXT,
    deserializer: to.xJsonString,
    serializer: from.optionalXJson,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.inferenceForm.fieldMapLabel', {
      defaultMessage: 'Field map (optional)',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.inferenceForm.fieldMapHelpText',
      {
        defaultMessage:
          'Maps document field names to the known field names of the model. Takes precedence over any mappings in the model.',
      }
    ),
    validations: [
      {
        validator: isXJsonField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.inferenceForm.fieldMapInvalidJSONError',
            { defaultMessage: 'Invalid JSON' }
          ),
          {
            allowEmptyString: true,
          }
        ),
      },
      {
        validator: isFieldMapObjectField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.inferenceForm.fieldMapMustBeObjectError',
            { defaultMessage: 'Field map must be a JSON object.' }
          )
        ),
      },
    ],
  },

  inference_config: {
    type: FIELD_TYPES.TEXT,
    deserializer: to.xJsonString,
    serializer: from.optionalXJson,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.inferenceForm.inferenceConfigLabel',
      {
        defaultMessage: 'Inference configuration (optional)',
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
};

export const Inference: FormFieldsComponent = ({ initialFieldValues }) => {
  const form = useFormContext();
  const { services } = useKibana();
  const documentationDocsLink = services.documentation.getDocumentationUrl();
  const initialUseFieldMapMode = useMemo(() => {
    if (!initialFieldValues) {
      return false;
    }
    return (
      Object.prototype.hasOwnProperty.call(initialFieldValues, 'target_field') ||
      Object.prototype.hasOwnProperty.call(initialFieldValues, 'field_map')
    );
  }, [initialFieldValues]);

  const [useFieldMapMode, setUseFieldMapMode] = useState<boolean>(initialUseFieldMapMode);

  useEffect(() => {
    setUseFieldMapMode(initialUseFieldMapMode);
  }, [initialUseFieldMapMode]);

  const setRegisteredFieldValue = useCallback(
    (path: string, value: unknown) => {
      const field = form.getFields?.()[path];
      if (field?.setValue) {
        field.setValue(value);
      }
    },
    [form]
  );

  const unsetField = useCallback(
    (fieldKey: string) => {
      const data = form.getFormData() as { fields?: Record<string, unknown> };
      const currentFields = data.fields ?? {};
      if (Object.prototype.hasOwnProperty.call(currentFields, fieldKey) === false) {
        return;
      }
      const nextFields = { ...currentFields };
      delete nextFields[fieldKey];
      form.setFieldValue('fields', nextFields);
    },
    [form]
  );

  const clearInputOutput = useCallback(() => {
    setRegisteredFieldValue('fields.input_output', '[]');
    unsetField('input_output');
  }, [setRegisteredFieldValue, unsetField]);

  const clearFieldMapMode = useCallback(() => {
    setRegisteredFieldValue('fields.target_field', '');
    unsetField('target_field');
    setRegisteredFieldValue('fields.field_map', '');
    unsetField('field_map');
  }, [setRegisteredFieldValue, unsetField]);

  // Normalize existing saved processors on open to avoid incompatible configs.
  // Avoid touching empty/new processors to prevent interfering with field registration.
  useEffect(() => {
    if (!initialFieldValues) return;

    const hasInputOutput = Object.prototype.hasOwnProperty.call(initialFieldValues, 'input_output');
    const hasFieldMapMode =
      Object.prototype.hasOwnProperty.call(initialFieldValues, 'target_field') ||
      Object.prototype.hasOwnProperty.call(initialFieldValues, 'field_map');

    if (initialUseFieldMapMode) {
      if (hasInputOutput) {
        clearInputOutput();
      }
      return;
    }

    if (hasFieldMapMode) {
      clearFieldMapMode();
    }
  }, [clearFieldMapMode, clearInputOutput, initialFieldValues, initialUseFieldMapMode]);

  const toggleMappingMode = useCallback(() => {
    setUseFieldMapMode((prev) => {
      const next = !prev;
      if (next) {
        clearInputOutput();
      } else {
        clearFieldMapMode();
      }
      return next;
    });
  }, [clearFieldMapMode, clearInputOutput]);

  return (
    <>
      <UseField
        config={fieldsConfig.model_id}
        component={Field}
        path="fields.model_id"
        data-test-subj="inferenceModelId"
      />
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth helpText={mappingModeToggleHelpText}>
        <EuiSwitch
          label={mappingModeToggleLabel}
          checked={useFieldMapMode}
          onChange={toggleMappingMode}
          data-test-subj="toggleInferenceInputMappingMode"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />

      {useFieldMapMode ? (
        <>
          <TargetField
            helpText={
              <FormattedMessage
                id="xpack.ingestPipelines.pipelineEditor.inferenceForm.targetFieldHelpText"
                defaultMessage="Field used to contain inference processor results. Defaults to {targetField}."
                values={{ targetField: <EuiCode>{'ml.inference.<processor_tag>'}</EuiCode> }}
              />
            }
          />

          <UseField
            config={fieldsConfig.field_map}
            component={XJsonEditor}
            componentProps={{
              editorProps: {
                'data-test-subj': 'fieldMap',
                height: EDITOR_PX_HEIGHT.medium,
                options: { minimap: { enabled: false } },
              },
            }}
            path="fields.field_map"
          />
        </>
      ) : (
        <UseField
          config={fieldsConfig.input_output}
          component={XJsonEditor}
          componentProps={{
            editorProps: {
              'data-test-subj': 'inputOutput',
              height: EDITOR_PX_HEIGHT.medium,
              options: { minimap: { enabled: false } },
            },
          }}
          path="fields.input_output"
        />
      )}

      <EuiSpacer size="s" />
      <UseField
        config={{
          ...fieldsConfig.inference_config,
          helpText: getInferenceConfigHelpText(documentationDocsLink),
        }}
        component={XJsonEditor}
        componentProps={{
          editorProps: {
            'data-test-subj': 'inferenceConfig',
            height: EDITOR_PX_HEIGHT.medium,
            options: { minimap: { enabled: false } },
          },
        }}
        path="fields.inference_config"
      />
    </>
  );
};
