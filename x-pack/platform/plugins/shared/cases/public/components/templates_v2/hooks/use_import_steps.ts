/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useCallback } from 'react';
import type { EuiStepsHorizontalProps } from '@elastic/eui';
import * as i18n from '../../templates/translations';
import { getStepStatus } from '../utils';

export enum ImportStep {
  UploadYaml = 1,
  SelectTemplates = 2,
}

interface UseImportStepsParams {
  isSelectEnabled: boolean;
}

export const useImportSteps = ({ isSelectEnabled }: UseImportStepsParams) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>(ImportStep.UploadYaml);

  const goToStep = useCallback((step: ImportStep) => {
    setCurrentStep(step);
  }, []);

  const isFirstStep = currentStep === ImportStep.UploadYaml;
  const isLastStep = currentStep === ImportStep.SelectTemplates;

  const horizontalSteps = useMemo<EuiStepsHorizontalProps['steps']>(
    () => [
      {
        title: i18n.STEP_UPLOAD_YAML,
        status: getStepStatus(ImportStep.UploadYaml, currentStep),
        onClick: () => goToStep(ImportStep.UploadYaml),
      },
      {
        title: i18n.STEP_SELECT_TEMPLATES,
        status: isSelectEnabled
          ? getStepStatus(ImportStep.SelectTemplates, currentStep)
          : 'disabled',
        onClick: isSelectEnabled ? () => goToStep(ImportStep.SelectTemplates) : () => {},
      },
    ],
    [currentStep, goToStep, isSelectEnabled]
  );

  return {
    currentStep,
    horizontalSteps,
    isFirstStep,
    isLastStep,
    goToStep,
  };
};
