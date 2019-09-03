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

interface AnalysisSetupStepsProps {
  setup: (startTime?: number | undefined, endTime?: number | undefined) => void;
  isSettingUp: boolean;
  didSetupFail: boolean;
  retry: (startTime?: number | undefined, endTime?: number | undefined) => void;
  isRetrying: boolean;
  hasCompletedSetup: boolean;
  hasAttemptedSetup: boolean;
  viewResults: () => void;
  indexPattern: string;
}

export const AnalysisSetupSteps: React.FunctionComponent<AnalysisSetupStepsProps> = ({
  setup: setupModule,
  retry: retrySetup,
  isSettingUp,
  didSetupFail,
  isRetrying,
  hasCompletedSetup,
  hasAttemptedSetup,
  viewResults,
  indexPattern,
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
          hasAttemptedSetup={hasAttemptedSetup}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          startTime={startTime}
          endTime={endTime}
        />
      ),
    },
    {
      title: i18n.translate('xpack.infra.analysisSetup.stepTwoTitle', {
        defaultMessage: 'Setup resources',
      }),
      children: (
        <SetupProcess
          isSettingUp={isSettingUp}
          didSetupFail={didSetupFail}
          isRetrying={isRetrying}
          hasCompletedSetup={hasCompletedSetup}
          viewResults={viewResults}
          setup={setup}
          retry={retry}
          indexPattern={indexPattern}
        />
      ),
      status:
        isSettingUp || isRetrying
          ? ('incomplete' as EuiStepStatus)
          : didSetupFail
          ? ('danger' as EuiStepStatus)
          : hasCompletedSetup
          ? ('complete' as EuiStepStatus)
          : undefined,
    },
  ];

  return <EuiSteps steps={steps} />;
};
