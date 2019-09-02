/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CreateMLJobsButton } from '../create_ml_jobs_button';

interface Props {
  isSettingUp: boolean;
  isCleaningUp: boolean;
  didSetupFail: boolean;
  hasCompletedSetup: boolean;
  viewResults: () => void;
  setup: () => void;
  cleanup: () => void;
}

export const SetupProcess: React.FunctionComponent<Props> = ({
  isSettingUp,
  didSetupFail,
  hasCompletedSetup,
  viewResults,
  setup,
  cleanup,
}: Props) => {
  return (
    <>
      {isSettingUp ? (
        <EuiLoadingSpinner size="xl" />
      ) : didSetupFail ? (
        <>
          <FormattedMessage
            id="xpack.infra.analysisSetup.steps.setupProcess.failureText"
            defaultMessage="Something went wrong creating the necessary Machine Learning resources"
          />
          <EuiButton fill onClick={cleanup}>
            <FormattedMessage
              id="xpack.infra.analysisSetup.steps.setupProcess.tryAgainButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        </>
      ) : hasCompletedSetup ? (
        <EuiButton fill onClick={viewResults}>
          <FormattedMessage
            id="xpack.infra.analysisSetup.steps.setupProcess.viewResultsButton"
            defaultMessage="View results"
          />
        </EuiButton>
      ) : (
        <>
          <CreateMLJobsButton isDisabled={isSettingUp} onClick={setup} />
        </>
      )}
    </>
  );
};
