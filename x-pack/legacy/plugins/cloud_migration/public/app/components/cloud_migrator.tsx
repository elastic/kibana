/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiSteps } from '@elastic/eui';

import { LocalClusterState, CloudClusterConfiguration } from '../../../common/types';
import { CreateCloudCluster, ReacCloudClusterConfig, MigrateData } from './steps_cloud_migrator';

type EuiStepStatus = 'complete' | 'incomplete' | 'warning' | 'danger' | 'disabled';

interface StepConfig {
  title: string;
  children: React.ReactNode;
  status: EuiStepStatus;
  disabled: boolean;
  onClick?(): void;
}

interface StepState<T = undefined> {
  isComplete: boolean;
  // isSelected: boolean;
  // isEnabled: boolean;
  data?: T;
}

export interface StepsState {
  step0: StepState<LocalClusterState>;
  step1: StepState<{ encoded: string; decoded: CloudClusterConfiguration }>;
  step2: StepState;
  [key: string]: StepState<
    LocalClusterState | { encoded: string; decoded: CloudClusterConfiguration } | undefined
  >;
}

export const CloudMigrator = () => {
  const [stepsState, setStepsState] = useState<StepsState>({
    step0: { isComplete: false /* isSelected: true, isEnabled: true */ },
    step1: { isComplete: false /* isSelected: true, isEnabled: true */ },
    step2: { isComplete: false /* isSelected: true, isEnabled: true */ },
  });

  const [currentStep, setCurrentStep] = useState<number>(0);

  const navigateToStep = (index: number, updatedStepsState: StepsState = stepsState) => {
    const previousStep = index > 0 ? `step${index - 1}` : null;
    if (previousStep && !updatedStepsState[previousStep].isComplete) {
      return;
    }
    setCurrentStep(index);
  };

  const onStepUpdate = (index: 0 | 1 | 2) => (updatedState: {
    isComplete: boolean;
    data?: any;
  }) => {
    const stepId = `step${index}`;

    setStepsState(prev => {
      const updatedStepState = { ...prev[stepId], ...updatedState };
      const newStepsState = { ...prev, [stepId]: updatedStepState };

      setTimeout(() => {
        // There is a bug in eUI that capture the onClick _also_ on the content (children Component)
        // We need to wait the next tick to change the step.
        navigateToStep(index + 1, newStepsState);
      });

      return newStepsState;
    });

    if (index === 2 && updatedState.isComplete) {
      // Migration completed
    }
  };

  const stepsTitles = [
    'Create your current cluster',
    'Read the configuration of your new cloud cluster',
    'Migrate your data to your cloud cluster',
  ];

  const stepsComponents = [CreateCloudCluster, ReacCloudClusterConfig, MigrateData];

  const steps: StepConfig[] = ([0, 1, 2] as Array<0 | 1 | 2>).map(index => {
    const stepId = `step${index}`;
    const title = stepsTitles[index];
    const Component = stepsComponents[index];

    return {
      title,
      children: (
        <Component
          onUpdate={onStepUpdate(index)}
          isEnabled={currentStep === index}
          stepsState={stepsState}
        />
      ),
      status: stepsState[stepId].isComplete ? 'complete' : 'incomplete',
      disabled: !stepsState[stepId].isComplete,
      onClick: () => navigateToStep(index),
    };
  });

  return <EuiSteps steps={steps} />;
};
