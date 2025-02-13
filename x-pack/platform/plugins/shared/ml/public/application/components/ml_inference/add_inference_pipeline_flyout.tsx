/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { extractErrorProperties } from '@kbn/ml-error-utils';

import type { DFAModelItem } from '../../../../common/types/trained_models';
import type { AddInferencePipelineSteps } from './types';
import { ADD_INFERENCE_PIPELINE_STEPS } from './constants';
import { AddInferencePipelineFooter } from '../shared';
import { AddInferencePipelineHorizontalSteps } from '../shared';
import { getInitialState, getModelType } from './state';
import { PipelineDetails } from './components/pipeline_details';
import { ProcessorConfiguration } from './components/processor_configuration';
import { OnFailureConfiguration } from '../shared';
import { TestPipeline } from './components/test_pipeline';
import { ReviewAndCreatePipeline } from '../shared';
import { useMlApi } from '../../contexts/kibana';
import { getPipelineConfig } from './get_pipeline_config';
import { validateInferencePipelineConfigurationStep } from './validation';
import { type MlInferenceState, type InferenceModelTypes, TEST_PIPELINE_MODE } from './types';
import { useFetchPipelines } from './hooks/use_fetch_pipelines';

export interface AddInferencePipelineFlyoutProps {
  onClose: () => void;
  model: DFAModelItem;
}

export const AddInferencePipelineFlyout: FC<AddInferencePipelineFlyoutProps> = ({
  onClose,
  model,
}) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialState = useMemo(() => getInitialState(model), [model.model_id]);
  const [formState, setFormState] = useState<MlInferenceState>(initialState);
  const [step, setStep] = useState<AddInferencePipelineSteps>(ADD_INFERENCE_PIPELINE_STEPS.DETAILS);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const {
    trainedModels: { createInferencePipeline },
  } = useMlApi();

  const modelType = getModelType(model);

  const createPipeline = async () => {
    setFormState({ ...formState, creatingPipeline: true });
    try {
      await createInferencePipeline(formState.pipelineName, getPipelineConfig(formState));
      setFormState({
        ...formState,
        pipelineCreated: true,
        creatingPipeline: false,
        pipelineError: undefined,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      const errorProperties = extractErrorProperties(e);
      setFormState({
        ...formState,
        creatingPipeline: false,
        pipelineError: errorProperties.message ?? e.message,
      });
    }
  };

  const pipelineNames = useFetchPipelines();

  const handleConfigUpdate = (configUpdate: Partial<MlInferenceState>) => {
    setFormState({ ...formState, ...configUpdate });
  };

  const { pipelineName: pipelineNameError, targetField: targetFieldError } = useMemo(() => {
    const errors = validateInferencePipelineConfigurationStep(
      formState.pipelineName,
      pipelineNames
    );
    return errors;
  }, [pipelineNames, formState.pipelineName]);

  const sourceIndex = useMemo(
    () =>
      Array.isArray(model.metadata?.analytics_config.source.index)
        ? model.metadata?.analytics_config.source.index.join()
        : model.metadata?.analytics_config.source.index,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model?.model_id]
  );

  return (
    <EuiFlyout onClose={onClose} size="l" data-test-subj="mlTrainedModelsInferencePipelineFlyout">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h3>
            {i18n.translate(
              'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.title',
              {
                defaultMessage: 'Deploy analytics model',
              }
            )}
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AddInferencePipelineHorizontalSteps
          step={step}
          setStep={setStep}
          isDetailsStepValid={pipelineNameError === undefined && targetFieldError === undefined}
          isConfigureProcessorStepValid={hasUnsavedChanges === false}
          hasProcessorStep
          pipelineCreated={formState.pipelineCreated}
        />
        <EuiSpacer size="m" />
        {step === ADD_INFERENCE_PIPELINE_STEPS.DETAILS && (
          <PipelineDetails
            handlePipelineConfigUpdate={handleConfigUpdate}
            pipelineName={formState.pipelineName}
            pipelineNameError={pipelineNameError}
            pipelineDescription={formState.pipelineDescription}
            modelId={model.model_id}
            targetField={formState.targetField}
            targetFieldError={targetFieldError}
          />
        )}
        {step === ADD_INFERENCE_PIPELINE_STEPS.CONFIGURE_PROCESSOR && model && (
          <ProcessorConfiguration
            condition={formState.condition}
            fieldMap={formState.fieldMap}
            handleAdvancedConfigUpdate={handleConfigUpdate}
            inferenceConfig={formState.inferenceConfig}
            modelInferenceConfig={model.inference_config}
            modelInputFields={model.input ?? []}
            modelType={modelType as InferenceModelTypes}
            setHasUnsavedChanges={setHasUnsavedChanges}
            tag={formState.tag}
          />
        )}
        {step === ADD_INFERENCE_PIPELINE_STEPS.ON_FAILURE && (
          <OnFailureConfiguration
            ignoreFailure={formState.ignoreFailure}
            takeActionOnFailure={formState.takeActionOnFailure}
            handleAdvancedConfigUpdate={handleConfigUpdate}
            onFailure={formState.onFailure}
          />
        )}
        {step === ADD_INFERENCE_PIPELINE_STEPS.TEST && (
          <TestPipeline
            sourceIndex={sourceIndex}
            state={formState}
            mode={TEST_PIPELINE_MODE.STEP}
          />
        )}
        {step === ADD_INFERENCE_PIPELINE_STEPS.CREATE && (
          <ReviewAndCreatePipeline
            inferencePipeline={getPipelineConfig(formState)}
            modelType={modelType}
            pipelineName={formState.pipelineName}
            pipelineCreated={formState.pipelineCreated}
            pipelineError={formState.pipelineError}
            sourceIndex={sourceIndex}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter className="mlTrainedModelsInferencePipelineFlyoutFooter">
        <AddInferencePipelineFooter
          onClose={onClose}
          onCreate={createPipeline}
          step={step}
          setStep={setStep}
          isDetailsStepValid={pipelineNameError === undefined && targetFieldError === undefined}
          isConfigureProcessorStepValid={hasUnsavedChanges === false}
          pipelineCreated={formState.pipelineCreated}
          creatingPipeline={formState.creatingPipeline}
          hasProcessorStep
        />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
