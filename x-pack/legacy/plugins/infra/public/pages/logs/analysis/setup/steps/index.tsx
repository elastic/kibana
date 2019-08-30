/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSteps, EuiStepStatus } from '@elastic/eui';
import { InitialConfiguration } from './initial_configuration';
import { SuccessOrFailure } from './success_or_failure';
import { useAnalysisSetupState } from '../../../../../containers/logs/log_analysis/log_analysis_setup_state';

interface AnalysisSetupStepsProps {
  setupMlModule: (startTime?: number | undefined, endTime?: number | undefined) => Promise<any>;
  isSettingUp: boolean;
  didSetupFail: boolean;
  isCleaningUpAFailedSetup: boolean;
  hasCompletedSetup: boolean;
}

export const AnalysisSetupSteps: React.FunctionComponent<AnalysisSetupStepsProps> = ({
  setupMlModule,
  isSettingUp,
  didSetupFail,
  isCleaningUpAFailedSetup,
  hasCompletedSetup,
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
        defaultMessage: 'Configuration',
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
      status: hasAttemptedSetup ? ('complete' as EuiStepStatus) : undefined,
    },
    {
      title: i18n.translate('xpack.infra.analysisSetup.stepTwoTitle', {
        defaultMessage: 'Setup status',
      }),
      children: (
        <SuccessOrFailure
          isSettingUp={isSettingUp}
          didSetupFail={didSetupFail}
          hasCompletedSetup={hasCompletedSetup}
        />
      ),
      status: !hasAttemptedSetup
        ? ('disabled' as EuiStepStatus)
        : isSettingUp
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
