/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSteps, EuiStepStatus } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { SetupStatus } from '../../../../../common/log_analysis';
import { useAnalysisSetupState } from '../../../../containers/logs/log_analysis/log_analysis_setup_state';
import { InitialConfigurationStep } from './initial_configuration_step';
import { ProcessStep } from './process_step';
import {
  ModuleDescriptor,
  ModuleSourceConfiguration,
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
    {
      title: i18n.translate('xpack.infra.analysisSetup.configurationStepTitle', {
        defaultMessage: 'Configuration',
      }),
      children: (
        <InitialConfigurationStep
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          startTime={startTime}
          endTime={endTime}
          isValidating={isValidating}
          validatedIndices={validatedIndices}
          setValidatedIndices={setValidatedIndices}
          validationErrors={validationErrors}
        />
      ),
    },
    {
      title: i18n.translate('xpack.infra.analysisSetup.actionStepTitle', {
        defaultMessage: 'Create ML job',
      }),
      children: (
        <ProcessStep
          cleanupAndSetup={cleanupAndSetup}
          errorMessages={errorMessages}
          isConfigurationValid={validationErrors.length <= 0}
          setup={setup}
          setupStatus={setupStatus}
          viewResults={viewResults}
        />
      ),
      status:
        setupStatus === 'pending'
          ? ('incomplete' as EuiStepStatus)
          : setupStatus === 'failed'
          ? ('danger' as EuiStepStatus)
          : setupStatus === 'succeeded'
          ? ('complete' as EuiStepStatus)
          : undefined,
    },
  ];

  return <EuiSteps steps={steps} />;
};
