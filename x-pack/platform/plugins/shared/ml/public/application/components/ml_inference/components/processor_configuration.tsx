/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, memo } from 'react';

import {
  EuiButtonEmpty,
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiPopover,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor } from '@kbn/code-editor';
import type { DFAModelItem } from '../../../../../common/types/trained_models';
import {
  EDIT_MESSAGE,
  CANCEL_EDIT_MESSAGE,
  CREATE_FIELD_MAPPING_MESSAGE,
  CLEAR_BUTTON_LABEL,
} from '../constants';
import { validateInferenceConfig } from '../validation';
import { isValidJson } from '../../../../../common/util/validation_utils';
import { SaveChangesButton } from './save_changes_button';
import { useMlKibana } from '../../../contexts/kibana';
import type { MlInferenceState, InferenceModelTypes } from '../types';
import { AdditionalAdvancedSettings } from './additional_advanced_settings';
import { validateFieldMap } from '../validation';

function getDefaultFieldMapString() {
  return JSON.stringify(
    {
      field_map: {
        incoming_field: 'field_the_model_expects',
      },
    },
    null,
    2
  );
}

interface Props {
  condition?: string;
  fieldMap: MlInferenceState['fieldMap'];
  handleAdvancedConfigUpdate: (configUpdate: Partial<MlInferenceState>) => void;
  inferenceConfig: DFAModelItem['inference_config'];
  modelInferenceConfig: DFAModelItem['inference_config'];
  modelInputFields: DFAModelItem['input'];
  modelType?: InferenceModelTypes;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  tag?: string;
}

export const ProcessorConfiguration: FC<Props> = memo(
  ({
    condition,
    fieldMap,
    handleAdvancedConfigUpdate,
    inferenceConfig,
    modelInputFields,
    modelInferenceConfig,
    modelType,
    setHasUnsavedChanges,
    tag,
  }) => {
    const {
      services: {
        docLinks: { links },
      },
    } = useMlKibana();

    const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
    const [editInferenceConfig, setEditInferenceConfig] = useState<boolean>(false);
    const [editFieldMapping, setEditFieldMapping] = useState<boolean>(false);
    const [inferenceConfigString, setInferenceConfigString] = useState<string>(
      JSON.stringify(inferenceConfig, null, 2)
    );
    const [inferenceConfigError, setInferenceConfigError] = useState<string | undefined>();
    const [fieldMapError, setFieldMapError] = useState<string | undefined>();
    const [fieldMappingString, setFieldMappingString] = useState<string>(
      fieldMap ? JSON.stringify(fieldMap, null, 2) : getDefaultFieldMapString()
    );
    const [isInferenceConfigValid, setIsInferenceConfigValid] = useState<boolean>(true);
    const [isFieldMapValid, setIsFieldMapValid] = useState<boolean>(true);

    const handleInferenceConfigChange = (json: string) => {
      setInferenceConfigString(json);
      const valid = isValidJson(json);
      setIsInferenceConfigValid(valid);
    };

    const updateInferenceConfig = () => {
      const invalidInferenceConfigMessage = validateInferenceConfig(
        JSON.parse(inferenceConfigString),
        modelType
      );

      if (invalidInferenceConfigMessage === undefined) {
        handleAdvancedConfigUpdate({ inferenceConfig: JSON.parse(inferenceConfigString) });
        setHasUnsavedChanges(false);
        setEditInferenceConfig(false);
        setInferenceConfigError(undefined);
      } else {
        setHasUnsavedChanges(true);
        setIsInferenceConfigValid(false);
        setInferenceConfigError(invalidInferenceConfigMessage);
      }
    };

    const resetInferenceConfig = () => {
      setInferenceConfigString(JSON.stringify(modelInferenceConfig, null, 2));
      setIsInferenceConfigValid(true);
      setInferenceConfigError(undefined);
    };

    const clearFieldMap = () => {
      setFieldMappingString('{}');
      setIsFieldMapValid(true);
      setFieldMapError(undefined);
    };

    const handleFieldMapChange = (json: string) => {
      setFieldMappingString(json);
      const valid = isValidJson(json);
      setIsFieldMapValid(valid);
    };

    const updateFieldMap = () => {
      const invalidFieldMapMessage = validateFieldMap(
        modelInputFields.field_names ?? [],
        JSON.parse(fieldMappingString)
      );

      if (invalidFieldMapMessage === undefined) {
        handleAdvancedConfigUpdate({ fieldMap: JSON.parse(fieldMappingString) });
        setHasUnsavedChanges(false);
        setEditFieldMapping(false);
        setFieldMapError(undefined);
      } else {
        setHasUnsavedChanges(true);
        setIsFieldMapValid(false);
        setFieldMapError(invalidFieldMapMessage);
      }
    };

    return (
      <EuiFlexGroup
        direction="column"
        data-test-subj="mlTrainedModelsInferencePipelineProcessorConfigStep"
      >
        {/* INFERENCE CONFIG */}
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={3}>
              <EuiTitle size="s">
                <h4>
                  {i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.inferenceConfigurationTitle',
                    { defaultMessage: 'Inference configuration' }
                  )}
                </h4>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText color="subdued" size="s">
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.description"
                    defaultMessage="The inference type and its options. Unless otherwise specified, the default configuration options are used. {inferenceDocsLink}."
                    values={{
                      inferenceDocsLink: (
                        <EuiLink external target="_blank" href={links.ingest.inference}>
                          Learn more.
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={7}>
              <EuiFormRow
                fullWidth
                labelAppend={
                  <EuiFlexGroup gutterSize="xs" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        data-test-subj="mlTrainedModelsInferencePipelineInferenceConfigEditButton"
                        iconType="pencil"
                        size="xs"
                        onClick={() => {
                          if (!editInferenceConfig === false) {
                            setInferenceConfigError(undefined);
                            setIsInferenceConfigValid(true);
                          }
                          setEditInferenceConfig(!editInferenceConfig);
                        }}
                      >
                        {editInferenceConfig ? CANCEL_EDIT_MESSAGE : EDIT_MESSAGE}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {editInferenceConfig ? (
                        <SaveChangesButton
                          onClick={updateInferenceConfig}
                          disabled={isInferenceConfigValid === false}
                        />
                      ) : null}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {editInferenceConfig ? (
                        <EuiButtonEmpty size="xs" onClick={resetInferenceConfig}>
                          {i18n.translate(
                            'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.resetInferenceConfigButton',
                            { defaultMessage: 'Reset' }
                          )}
                        </EuiButtonEmpty>
                      ) : null}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                error={inferenceConfigError ?? inferenceConfigError}
                isInvalid={inferenceConfigError !== undefined || inferenceConfigError !== undefined}
                data-test-subj="mlTrainedModelsInferencePipelineInferenceConfigEditor"
              >
                {editInferenceConfig ? (
                  <CodeEditor
                    height={300}
                    languageId="json"
                    options={{
                      automaticLayout: true,
                      lineNumbers: 'off',
                      tabSize: 2,
                    }}
                    value={inferenceConfigString}
                    onChange={handleInferenceConfigChange}
                  />
                ) : (
                  <EuiCodeBlock
                    isCopyable={true}
                    data-test-subj="mlTrainedModelsInferencePipelineInferenceConfigBlock"
                  >
                    {JSON.stringify(inferenceConfig, null, 2)}
                  </EuiCodeBlock>
                )}
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {/* FIELD MAP */}
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={3}>
              <EuiTitle size="s">
                <h4>
                  {i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.fieldMapTitle',
                    { defaultMessage: 'Fields' }
                  )}
                </h4>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText color="subdued" size="s">
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.fieldMapDescriptionTwo"
                    defaultMessage="The model expects certain input fields. {fieldsList}"
                    values={{
                      fieldsList: (
                        <EuiPopover
                          button={
                            <EuiLink onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
                              You can review them here.
                            </EuiLink>
                          }
                          isOpen={isPopoverOpen}
                          closePopover={() => setIsPopoverOpen(false)}
                          anchorPosition="downLeft"
                        >
                          <EuiCodeBlock isCopyable={true}>
                            {JSON.stringify(modelInputFields, null, 2)}
                          </EuiCodeBlock>
                        </EuiPopover>
                      ),
                    }}
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.fieldMapExtendedDescription"
                    defaultMessage="If the fields for the incoming data differ, a {fieldMap} must be created to map the input document field name to the name of the field that the model expects. It must be in JSON format. {inferenceDocsLink}"
                    values={{
                      fieldMap: <EuiCode>{'field_map'}</EuiCode>,
                      inferenceDocsLink: (
                        <EuiLink external target="_blank" href={links.ingest.inference}>
                          Learn more.
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={7}>
              <EuiFormRow
                fullWidth
                labelAppend={
                  <EuiFlexGroup gutterSize="xs" justifyContent="flexStart">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        data-test-subj="mlTrainedModelsInferencePipelineFieldMapEditButton"
                        iconType="pencil"
                        size="xs"
                        onClick={() => {
                          const editingState = !editFieldMapping;
                          if (editingState === false) {
                            setFieldMapError(undefined);
                            setIsFieldMapValid(true);
                            setHasUnsavedChanges(false);
                          }
                          setEditFieldMapping(editingState);
                        }}
                      >
                        {editFieldMapping
                          ? CANCEL_EDIT_MESSAGE
                          : fieldMap !== undefined
                          ? EDIT_MESSAGE
                          : CREATE_FIELD_MAPPING_MESSAGE}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    {editFieldMapping ? (
                      <EuiFlexItem grow={false}>
                        <SaveChangesButton
                          onClick={updateFieldMap}
                          disabled={isFieldMapValid === false}
                        />
                      </EuiFlexItem>
                    ) : null}
                    {editFieldMapping ? (
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty size="xs" onClick={clearFieldMap}>
                          {CLEAR_BUTTON_LABEL}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                }
                error={fieldMapError}
                isInvalid={fieldMapError !== undefined}
                data-test-subj="mlTrainedModelsInferencePipelineFieldMapEdit"
              >
                <>
                  {!editFieldMapping ? (
                    <EuiCodeBlock
                      isCopyable={true}
                      overflowHeight={350}
                      data-test-subj="mlTrainedModelsInferencePipelineFieldMapBlock"
                    >
                      {JSON.stringify(fieldMap ?? {}, null, 2)}
                    </EuiCodeBlock>
                  ) : null}
                  {editFieldMapping ? (
                    <>
                      <EuiSpacer size="s" />
                      <CodeEditor
                        height={300}
                        languageId="json"
                        options={{
                          automaticLayout: true,
                          lineNumbers: 'off',
                          tabSize: 2,
                        }}
                        value={fieldMappingString}
                        onChange={handleFieldMapChange}
                      />
                    </>
                  ) : null}
                </>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {/* ADDITIONAL ADVANCED SETTINGS */}
        <EuiFlexItem>
          <AdditionalAdvancedSettings
            handleAdvancedConfigUpdate={handleAdvancedConfigUpdate}
            condition={condition}
            tag={tag}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
