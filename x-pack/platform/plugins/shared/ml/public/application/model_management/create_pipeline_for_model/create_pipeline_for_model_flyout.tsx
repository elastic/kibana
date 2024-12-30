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
import type { SupportedPytorchTasksType } from '@kbn/ml-trained-models-utils';

import type { TrainedModelItem } from '../../../../common/types/trained_models';
import type { AddInferencePipelineSteps } from '../../components/ml_inference/types';
import { ADD_INFERENCE_PIPELINE_STEPS } from '../../components/ml_inference/constants';
import { AddInferencePipelineFooter } from '../../components/shared';
import { AddInferencePipelineHorizontalSteps } from '../../components/shared';
import { getInitialState } from './state';
import { PipelineDetails } from './pipeline_details';
import { TestTrainedModel } from './test_trained_model';
import { OnFailureConfiguration } from '../../components/shared';
import { ReviewAndCreatePipeline } from '../../components/shared';
import { useMlApi } from '../../contexts/kibana';
import { getPipelineConfig } from './get_pipeline_config';
import { validateInferencePipelineConfigurationStep } from '../../components/ml_inference/validation';
import { type InferecePipelineCreationState } from './state';
import { useFetchPipelines } from '../../components/ml_inference/hooks/use_fetch_pipelines';
import { useTestTrainedModelsContext } from '../test_models/test_trained_models_context';

export interface CreatePipelineForModelFlyoutProps {
  onClose: (refreshList?: boolean) => void;
  model: TrainedModelItem;
}

export const CreatePipelineForModelFlyout: FC<CreatePipelineForModelFlyoutProps> = ({
  onClose,
  model,
}) => {
  const {
    currentContext: { pipelineConfig },
  } = useTestTrainedModelsContext();

  const initialState = useMemo(
    () => getInitialState(model, pipelineConfig),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model.model_id, pipelineConfig]
  );
  const [formState, setFormState] = useState<InferecePipelineCreationState>(initialState);
  const [step, setStep] = useState<AddInferencePipelineSteps>(ADD_INFERENCE_PIPELINE_STEPS.DETAILS);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const taskType = useMemo(
    () => Object.keys(model.inference_config ?? {})[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model.model_id]
  ) as SupportedPytorchTasksType;

  const {
    trainedModels: { createInferencePipeline },
  } = useMlApi();

  const createPipeline = async () => {
    setFormState({ ...formState, creatingPipeline: true });
    try {
      const config = getPipelineConfig(formState);
      await createInferencePipeline(formState.pipelineName, config);
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

  const handleConfigUpdate = (configUpdate: Partial<InferecePipelineCreationState>) => {
    const updatedState = { ...formState, ...configUpdate };
    setFormState(updatedState);
  };

  const handleSetStep = (currentStep: AddInferencePipelineSteps) => {
    setStep(currentStep);
  };

  const { pipelineName: pipelineNameError } = useMemo(() => {
    const errors = validateInferencePipelineConfigurationStep(
      formState.pipelineName,
      pipelineNames
    );
    return errors;
  }, [pipelineNames, formState.pipelineName]);

  return (
    <EuiFlyout
      onClose={onClose.bind(null, true)}
      size="l"
      data-test-subj="mlTrainedModelsFromTestInferencePipelineFlyout"
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h3>
            {i18n.translate(
              'xpack.ml.trainedModels.content.indices.pipelines.createInferencePipeline.title',
              {
                defaultMessage: 'Create inference pipeline',
              }
            )}
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AddInferencePipelineHorizontalSteps
          step={step}
          setStep={handleSetStep}
          isDetailsStepValid={pipelineNameError === undefined}
          isConfigureProcessorStepValid={hasUnsavedChanges === false}
          hasProcessorStep={false}
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
            taskType={taskType}
            initialPipelineConfig={formState.initialPipelineConfig}
            setHasUnsavedChanges={setHasUnsavedChanges}
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
          <TestTrainedModel
            model={model}
            handlePipelineConfigUpdate={handleConfigUpdate}
            externalPipelineConfig={getPipelineConfig(formState)}
          />
        )}
        {step === ADD_INFERENCE_PIPELINE_STEPS.CREATE && (
          <ReviewAndCreatePipeline
            highlightTargetField
            inferencePipeline={getPipelineConfig(formState)}
            pipelineName={formState.pipelineName}
            pipelineCreated={formState.pipelineCreated}
            pipelineError={formState.pipelineError}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter className="mlTrainedModelsInferencePipelineFlyoutFooter">
        <AddInferencePipelineFooter
          onClose={onClose}
          onCreate={createPipeline}
          step={step}
          setStep={handleSetStep}
          isDetailsStepValid={pipelineNameError === undefined}
          isConfigureProcessorStepValid={hasUnsavedChanges === false}
          pipelineCreated={formState.pipelineCreated}
          creatingPipeline={formState.creatingPipeline}
          hasProcessorStep={false}
        />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
