/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiStepsHorizontal } from '@elastic/eui';
import { useAppDependencies } from '../../index';

interface Props {
  currentStep: number;
  maxCompletedStep: number;
  updateCurrentStep: (step: number) => void;
}

export const RestoreSnapshotNavigation: React.FunctionComponent<Props> = ({
  currentStep,
  maxCompletedStep,
  updateCurrentStep,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();

  const steps = [
    {
      title: i18n.translate('xpack.snapshotRestore.restoreForm.navigation.stepLogisticsName', {
        defaultMessage: 'Logistics',
      }),
      isComplete: maxCompletedStep >= 1,
      isSelected: currentStep === 1,
      onClick: () => updateCurrentStep(1),
    },
    {
      title: i18n.translate('xpack.snapshotRestore.restoreForm.navigation.stepSettingsName', {
        defaultMessage: 'Index settings',
      }),
      isComplete: maxCompletedStep >= 2,
      isSelected: currentStep === 2,
      disabled: maxCompletedStep < 1,
      onClick: () => updateCurrentStep(2),
    },
    {
      title: i18n.translate('xpack.snapshotRestore.restoreForm.navigation.stepReviewName', {
        defaultMessage: 'Review',
      }),
      isComplete: maxCompletedStep >= 2,
      isSelected: currentStep === 3,
      disabled: maxCompletedStep < 2,
      onClick: () => updateCurrentStep(3),
    },
  ];

  return <EuiStepsHorizontal steps={steps} />;
};
