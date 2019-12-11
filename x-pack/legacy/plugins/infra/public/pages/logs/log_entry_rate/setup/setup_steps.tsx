/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSteps } from '@elastic/eui';
import React from 'react';

import { SetupStatus } from '../../../../../common/log_analysis';
import {
  createInitialConfigurationStep,
  createProcessStep,
} from '../../../../components/logging/log_analysis_setup';
import {
  ModuleDescriptor,
  ModuleSourceConfiguration,
  useAnalysisSetupState,
} from '../../../../containers/logs/log_analysis';

type SetupHandler = (
  indices: string[],
  startTime: number | undefined,
  endTime: number | undefined
) => void;

interface LogEntryRateSetupStepsProps<JobType extends string> {
  cleanupAndSetup: SetupHandler;
  errorMessages: string[];
  setup: SetupHandler;
  setupStatus: SetupStatus;
  viewResults: () => void;
  moduleDescriptor: ModuleDescriptor<JobType>;
  sourceConfiguration: ModuleSourceConfiguration;
}

export const LogEntryRateSetupSteps = <JobType extends string>({
  cleanupAndSetup: cleanupAndSetupModule,
  errorMessages,
  setup: setupModule,
  setupStatus,
  viewResults,
  moduleDescriptor,
  sourceConfiguration,
}: LogEntryRateSetupStepsProps<JobType>) => {
  const {
    setup,
    cleanupAndSetup,
    setStartTime,
    setEndTime,
    startTime,
    endTime,
    isValidating,
    validationErrors,
    validatedIndices,
    setValidatedIndices,
  } = useAnalysisSetupState({
    cleanupAndSetupModule,
    moduleDescriptor,
    setupModule,
    sourceConfiguration,
  });

  const steps = [
    createInitialConfigurationStep({
      setStartTime,
      setEndTime,
      startTime,
      endTime,
      isValidating,
      validatedIndices,
      setValidatedIndices,
      validationErrors,
    }),
    createProcessStep({
      cleanupAndSetup,
      errorMessages,
      isConfigurationValid: validationErrors.length <= 0,
      setup,
      setupStatus,
      viewResults,
    }),
  ];

  return <EuiSteps steps={steps} />;
};
