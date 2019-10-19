/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { SetupStatus } from '../../../../../../common/log_analysis';
import { CreateMLJobsButton } from '../create_ml_jobs_button';
import { RecreateMLJobsButton } from '../recreate_ml_jobs_button';

interface Props {
  viewResults: () => void;
  setup: () => void;
  cleanupAndSetup: () => void;
  indexPattern: string;
  setupStatus: SetupStatus;
}

export const SetupProcess: React.FunctionComponent<Props> = ({
  viewResults,
  setup,
  cleanupAndSetup,
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
              defaultMessage="Creating ML job..."
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
          <EuiButton fill onClick={cleanupAndSetup}>
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
      ) : setupStatus === 'requiredForUpdate' || setupStatus === 'requiredForReconfiguration' ? (
        <RecreateMLJobsButton onClick={cleanupAndSetup} />
      ) : (
        <CreateMLJobsButton onClick={setup} />
      )}
    </EuiText>
  );
};
