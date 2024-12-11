/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { AddInferencePipelineSteps } from '../ml_inference/types';
import {
  BACK_BUTTON_LABEL,
  CANCEL_BUTTON_LABEL,
  CLOSE_BUTTON_LABEL,
  CONTINUE_BUTTON_LABEL,
} from '../ml_inference/constants';
import { getSteps } from '../ml_inference/get_steps';

interface Props {
  isDetailsStepValid: boolean;
  isConfigureProcessorStepValid: boolean;
  pipelineCreated: boolean;
  creatingPipeline: boolean;
  step: AddInferencePipelineSteps;
  onClose: () => void;
  onCreate: () => void;
  setStep: (step: AddInferencePipelineSteps) => void;
  hasProcessorStep: boolean;
}

export const AddInferencePipelineFooter: FC<Props> = ({
  isDetailsStepValid,
  isConfigureProcessorStepValid,
  creatingPipeline,
  pipelineCreated,
  onClose,
  onCreate,
  step,
  setStep,
  hasProcessorStep,
}) => {
  const { nextStep, previousStep, isContinueButtonEnabled } = useMemo(
    () => getSteps(step, isDetailsStepValid, isConfigureProcessorStepValid, hasProcessorStep),
    [isDetailsStepValid, isConfigureProcessorStepValid, step, hasProcessorStep]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={onClose}
          data-test-subj="mlTrainedModelsInferencePipelineCloseButton"
        >
          {pipelineCreated ? CLOSE_BUTTON_LABEL : CANCEL_BUTTON_LABEL}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem />
      <EuiFlexItem grow={false}>
        {previousStep !== undefined && pipelineCreated === false ? (
          <EuiButtonEmpty
            flush="both"
            iconType="arrowLeft"
            onClick={() => setStep(previousStep as AddInferencePipelineSteps)}
          >
            {BACK_BUTTON_LABEL}
          </EuiButtonEmpty>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {nextStep !== undefined ? (
          <EuiButton
            data-test-subj="mlTrainedModelsInferencePipelineContinueButton"
            iconType="arrowRight"
            iconSide="right"
            onClick={() => setStep(nextStep as AddInferencePipelineSteps)}
            disabled={!isContinueButtonEnabled}
            fill
          >
            {CONTINUE_BUTTON_LABEL}
          </EuiButton>
        ) : (
          <EuiButton
            data-test-subj="mlTrainedModelsInferencePipelineCreateButton"
            color="success"
            disabled={!isContinueButtonEnabled || creatingPipeline || pipelineCreated}
            fill
            onClick={onCreate}
            isLoading={creatingPipeline}
          >
            {i18n.translate(
              'xpack.ml.trainedModels.content.indices.addInferencePipelineModal.footer.create',
              {
                defaultMessage: 'Create pipeline',
              }
            )}
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
