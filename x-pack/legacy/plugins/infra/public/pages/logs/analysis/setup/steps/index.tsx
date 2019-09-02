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
  setupMlModule: (startTime?: number | undefined, endTime?: number | undefined) => Promise<any>;
  isSettingUp: boolean;
  didSetupFail: boolean;
  cleanupFailure: () => void;
  isCleaningUpAFailedSetup: boolean;
  hasCompletedSetup: boolean;
  viewResults: () => void;
}

export const AnalysisSetupSteps: React.FunctionComponent<AnalysisSetupStepsProps> = ({
  setupMlModule,
  isSettingUp,
  didSetupFail,
  isCleaningUpAFailedSetup,
  hasCompletedSetup,
  viewResults,
  cleanupFailure,
}: AnalysisSetupStepsProps) => {
  const {
    hasAttemptedSetup,
    setup,
    setStartTime,
    setEndTime,
    startTime,
    endTime,
  } = useAnalysisSetupState({ setupMlModule });

  const steps = [
    {
      title: i18n.translate('xpack.infra.analysisSetup.stepOneTitle', {
        defaultMessage: 'Configuration (optional)',
      }),
      children: (
        <InitialConfiguration
          setupMlModule={setup}
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
          isCleaningUp={isCleaningUpAFailedSetup}
          hasCompletedSetup={hasCompletedSetup}
          viewResults={viewResults}
          setup={setup}
          cleanup={cleanupFailure}
        />
      ),
      status: isSettingUp
        ? ('incomplete' as EuiStepStatus)
        : didSetupFail
        ? ('danger' as EuiStepStatus)
        : hasCompletedSetup
        ? ('success' as EuiStepStatus)
        : undefined,
    },
  ];
  return <EuiSteps steps={steps} />;
};
