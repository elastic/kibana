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

type SetupHandler = (startTime?: number | undefined, endTime?: number | undefined) => void;

interface AnalysisSetupStepsProps {
  cleanupAndSetup: SetupHandler;
  indexPattern: string;
  setup: SetupHandler;
  setupStatus: SetupStatus;
  viewResults: () => void;
}

export const AnalysisSetupSteps: React.FunctionComponent<AnalysisSetupStepsProps> = ({
  cleanupAndSetup: cleanupAndSetupModule,
  indexPattern,
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
  } = useAnalysisSetupState({
    setupModule,
    cleanupAndSetupModule,
  });

  const steps = [
    {
      title: i18n.translate('xpack.infra.analysisSetup.stepOneTitle', {
        defaultMessage: 'Configuration (optional)',
      }),
      children: (
        <InitialConfiguration
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          startTime={startTime}
          endTime={endTime}
        />
      ),
    },
    {
      title: i18n.translate('xpack.infra.analysisSetup.stepTwoTitle', {
        defaultMessage: 'Create ML job',
      }),
      children: (
        <SetupProcess
          setupStatus={setupStatus}
          viewResults={viewResults}
          setup={setup}
          cleanupAndSetup={cleanupAndSetup}
          indexPattern={indexPattern}
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
