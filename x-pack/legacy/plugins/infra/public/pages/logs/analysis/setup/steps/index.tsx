/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSteps, EuiStepStatus } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { SetupStatus } from '../../../../../../common/log_analysis';
import { useAnalysisSetupState } from '../../../../../containers/logs/log_analysis/log_analysis_setup_state';
import { InitialConfiguration } from './initial_configuration';
import { SetupProcess } from './setup_process';

type SetupHandler = (
  indices: string[],
  startTime: number | undefined,
  endTime: number | undefined
) => void;

interface AnalysisSetupStepsProps {
  availableIndices: string[];
  cleanupAndSetup: SetupHandler;
  setup: SetupHandler;
  setupStatus: SetupStatus;
  viewResults: () => void;
}

export const AnalysisSetupSteps: React.FunctionComponent<AnalysisSetupStepsProps> = ({
  availableIndices,
  cleanupAndSetup: cleanupAndSetupModule,
  setup: setupModule,
  setupStatus,
  viewResults,
}: AnalysisSetupStepsProps) => {
  const {
    setup,
    cleanupAndSetup,
    setStartTime,
    setEndTime,
    startTime,
    endTime,
    selectedIndexNames,
    selectedIndices,
    setSelectedIndices,
    validationErrors,
  } = useAnalysisSetupState({
    availableIndices,
    setupModule,
    cleanupAndSetupModule,
  });

  const steps = [
    {
      title: i18n.translate('xpack.infra.analysisSetup.configurationStepTitle', {
        defaultMessage: 'Configuration',
      }),
      children: (
        <InitialConfiguration
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          startTime={startTime}
          endTime={endTime}
          selectedIndices={selectedIndices}
          setSelectedIndices={setSelectedIndices}
          validationErrors={validationErrors}
        />
      ),
    },
    {
      title: i18n.translate('xpack.infra.analysisSetup.actionStepTitle', {
        defaultMessage: 'Create ML job',
      }),
      children: (
        <SetupProcess
          indices={selectedIndexNames}
          setupStatus={setupStatus}
          viewResults={viewResults}
          setup={setup}
          cleanupAndSetup={cleanupAndSetup}
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
