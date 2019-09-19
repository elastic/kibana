/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiLoadingSpinner,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CreateMLJobsButton } from '../create_ml_jobs_button';
import { SetupStatus } from '../../../../../containers/logs/log_analysis';

interface Props {
  viewResults: () => void;
  setup: () => void;
  retry: () => void;
  indexPattern: string;
  setupStatus: SetupStatus;
}

export const SetupProcess: React.FunctionComponent<Props> = ({
  viewResults,
  setup,
  retry,
  indexPattern,
  setupStatus,
}: Props) => {
  return (
    <EuiText size="s">
      {setupStatus === 'pending' ? (
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
      ) : setupStatus === 'failed' ? (
        <>
          <FormattedMessage
            id="xpack.infra.analysisSetup.steps.setupProcess.failureText"
            defaultMessage="Something went wrong creating the necessary ML jobs.
            Please ensure your configured logs indices ({indexPattern}) exist."
            values={{
              indexPattern,
            }}
          />
          <EuiSpacer />
          <EuiButton fill onClick={retry}>
            <FormattedMessage
              id="xpack.infra.analysisSetup.steps.setupProcess.tryAgainButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        </>
      ) : setupStatus === 'succeeded' ? (
        <>
          <FormattedMessage
            id="xpack.infra.analysisSetup.steps.setupProcess.successText"
            defaultMessage="The ML jobs have been set up successfully"
          />
          <EuiSpacer />
          <EuiButton fill onClick={viewResults}>
            <FormattedMessage
              id="xpack.infra.analysisSetup.steps.setupProcess.viewResultsButton"
              defaultMessage="View results"
            />
          </EuiButton>
        </>
      ) : (
        <CreateMLJobsButton onClick={setup} />
      )}
    </EuiText>
  );
};
