/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSteps, EuiStepStatus } from '@elastic/eui';
import { InitialConfiguration } from './initial_configuration';
import { SetupProcess } from './setup_process';
import { useAnalysisSetupState } from '../../../../../containers/logs/log_analysis/log_analysis_setup_state';
import { SetupStatus } from '../../../../../containers/logs/log_analysis';

interface AnalysisSetupStepsProps {
  setup: (startTime?: number | undefined, endTime?: number | undefined) => void;
  retry: (startTime?: number | undefined, endTime?: number | undefined) => void;
  viewResults: () => void;
  indexPattern: string;
  setupStatus: SetupStatus;
}

export const AnalysisSetupSteps: React.FunctionComponent<AnalysisSetupStepsProps> = ({
  setup: setupModule,
  retry: retrySetup,
  viewResults,
  indexPattern,
  setupStatus,
}: AnalysisSetupStepsProps) => {
  const { setup, retry, setStartTime, setEndTime, startTime, endTime } = useAnalysisSetupState({
    setupModule,
    retrySetup,
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
        defaultMessage: 'Create ML jobs',
      }),
      children: (
        <SetupProcess
          setupStatus={setupStatus}
          viewResults={viewResults}
          setup={setup}
          retry={retry}
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
