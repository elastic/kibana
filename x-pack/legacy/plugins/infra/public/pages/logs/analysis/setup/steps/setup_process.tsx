/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiButton, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CreateMLJobsButton } from '../create_ml_jobs_button';
import { StepText } from './step_text';

interface Props {
  isSettingUp: boolean;
  isRetrying: boolean;
  didSetupFail: boolean;
  hasCompletedSetup: boolean;
  viewResults: () => void;
  setup: () => void;
  retry: () => void;
  indexPattern: string;
}

export const SetupProcess: React.FunctionComponent<Props> = ({
  isSettingUp,
  didSetupFail,
  hasCompletedSetup,
  viewResults,
  setup,
  retry,
  isRetrying,
  indexPattern,
}: Props) => {
  return (
    <>
      <StepText>
        {isSettingUp || isRetrying ? (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.infra.analysisSetup.steps.setupProcess.loadingText"
                defaultMessage="Creating ML jobs..."
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : didSetupFail ? (
          <>
            <FormattedMessage
              id="xpack.infra.analysisSetup.steps.setupProcess.failureText"
              defaultMessage="Something went wrong creating the necessary Machine Learning jobs.
              Please ensure your configured logs indices ({indexPattern}) exist."
              values={{
                indexPattern,
              }}
            />
            <EuiSpacer />
            <EuiButton fill onClick={retry} disabled={isRetrying}>
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
      </StepText>
    </>
  );
};
