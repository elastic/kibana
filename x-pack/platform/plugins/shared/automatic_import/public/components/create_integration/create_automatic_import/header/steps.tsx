/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiStepsHorizontal, type EuiStepStatus, type EuiStepsHorizontalProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

// Custom styles for the EuiStepsHorizontal component suggested by design team
const stepsCss = css`
  margin-left: -66px;
  margin-right: -59px;
`;

interface StepsProps {
  currentStep: number;
  setStep: (step: number) => void;
  isGenerating: boolean;
}

const STEP_CONNECTOR = i18n.translate('xpack.automaticImport.step.connector', {
  defaultMessage: 'Connector',
});

const STEP_INTEGRATION = i18n.translate('xpack.automaticImport.step.integration', {
  defaultMessage: 'Integration',
});

const STEP_DATA_STREAM = i18n.translate('xpack.automaticImport.step.dataStream', {
  defaultMessage: 'Data stream',
});

const STEP_REVIEW = i18n.translate('xpack.automaticImport.step.review', {
  defaultMessage: 'Review',
});

const getStepStatus = (step: number, currentStep: number, loading?: boolean): EuiStepStatus => {
  if (step === currentStep) {
    return loading ? 'loading' : 'current';
  } else if (step < currentStep) {
    return 'complete';
  } else {
    return 'disabled';
  }
};

const getStepOnClick = (step: number, currentStep: number, setStep: (step: number) => void) => {
  if (step < currentStep) {
    return () => setStep(step);
  }
  return () => {};
};

export const Steps = React.memo<StepsProps>(({ currentStep, setStep, isGenerating }) => {
  const steps = useMemo<EuiStepsHorizontalProps['steps']>(() => {
    return [
      {
        title: STEP_CONNECTOR,
        status: getStepStatus(1, currentStep),
        onClick: getStepOnClick(1, currentStep, setStep),
      },
      {
        title: STEP_INTEGRATION,
        status: getStepStatus(2, currentStep),
        onClick: getStepOnClick(2, currentStep, setStep),
      },
      {
        title: STEP_DATA_STREAM,
        status: getStepStatus(3, currentStep, isGenerating),
        onClick: getStepOnClick(3, currentStep, setStep),
      },
      {
        title: STEP_REVIEW,
        status: getStepStatus(4, currentStep, isGenerating),
        onClick: getStepOnClick(4, currentStep, setStep),
      },
    ];
  }, [currentStep, setStep, isGenerating]);

  return <EuiStepsHorizontal steps={steps} size="s" css={stepsCss} />;
});
Steps.displayName = 'Steps';
