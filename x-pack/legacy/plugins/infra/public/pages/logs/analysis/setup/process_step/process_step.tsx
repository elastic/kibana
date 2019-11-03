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
  EuiCallOut,
  EuiCode,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { SetupStatus } from '../../../../../../common/log_analysis';
import { CreateMLJobsButton } from './create_ml_jobs_button';
import { RecreateMLJobsButton } from './recreate_ml_jobs_button';

interface ProcessStepProps {
  cleanupAndSetup: () => void;
  setupErrorMessages: string[];
  validationErrors: string[];
  isConfigurationValid: boolean;
  setup: () => void;
  setupStatus: SetupStatus;
  viewResults: () => void;
}

export const ProcessStep: React.FunctionComponent<ProcessStepProps> = ({
  cleanupAndSetup,
  setupErrorMessages,
  validationErrors,
  isConfigurationValid,
  setup,
  setupStatus,
  viewResults,
}) => {
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
            defaultMessage="Something went wrong creating the necessary ML jobs. Please ensure all selected log indices exist."
          />
          <EuiSpacer />
          {setupErrorMessages.map((errorMessage, i) => (
            <EuiCallOut key={i} color="danger" iconType="alert" title={errorCalloutTitle}>
              <EuiCode transparentBackground>{errorMessage}</EuiCode>
            </EuiCallOut>
          ))}
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
        <>
          <ValidationErrors messages={validationErrors} />
          <RecreateMLJobsButton isDisabled={!isConfigurationValid} onClick={cleanupAndSetup} />
        </>
      ) : (
        <>
          <ValidationErrors messages={validationErrors} />
          <CreateMLJobsButton isDisabled={!isConfigurationValid} onClick={setup} />
        </>
      )}
    </EuiText>
  );
};

const errorCalloutTitle = i18n.translate(
  'xpack.infra.analysisSetup.steps.setupProcess.errorCalloutTitle',
  {
    defaultMessage: 'An error occurred',
  }
);

const ValidationErrors: React.FC<{ messages: string[] }> = ({ messages }) => {
  if (messages.length === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut color="danger" iconType="alert" title={errorCalloutTitle}>
        <ul>
          {messages.map((message, i) => (
            <li key={i}>{message}</li>
          ))}
        </ul>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
