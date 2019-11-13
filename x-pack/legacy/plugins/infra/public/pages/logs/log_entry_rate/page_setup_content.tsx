/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiText,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import euiStyled from '../../../../../../common/eui_styled_components';
import { SetupStatus } from '../../../../common/log_analysis';
import { useTrackPageview } from '../../../hooks/use_track_metric';
import { LogEntryRateSetupSteps } from './setup';

type SetupHandler = (
  indices: string[],
  startTime: number | undefined,
  endTime: number | undefined
) => void;

interface LogEntryRateSetupContentProps {
  availableIndices: string[];
  cleanupAndSetup: SetupHandler;
  errorMessages: string[];
  setup: SetupHandler;
  setupStatus: SetupStatus;
  viewResults: () => void;
}

export const LogEntryRateSetupContent: React.FunctionComponent<LogEntryRateSetupContentProps> = ({
  availableIndices,
  cleanupAndSetup,
  errorMessages,
  setup,
  setupStatus,
  viewResults,
}) => {
  useTrackPageview({ app: 'infra_logs', path: 'analysis_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'analysis_setup', delay: 15000 });

  return (
    <LogEntryRateSetupPage>
      <EuiPageBody>
        <LogEntryRateSetupPageContent
          verticalPosition="center"
          horizontalPosition="center"
          data-test-subj="analysisSetupContent"
        >
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle size="m">
                <h3>
                  <FormattedMessage
                    id="xpack.infra.analysisSetup.analysisSetupTitle"
                    defaultMessage="Enable Machine Learning analysis"
                  />
                </h3>
              </EuiTitle>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.infra.analysisSetup.analysisSetupDescription"
                defaultMessage="Use Machine Learning to automatically detect anomalous log rate counts."
              />
            </EuiText>
            <EuiSpacer />
            <LogEntryRateSetupSteps
              availableIndices={availableIndices}
              cleanupAndSetup={cleanupAndSetup}
              errorMessages={errorMessages}
              setup={setup}
              setupStatus={setupStatus}
              viewResults={viewResults}
            />
          </EuiPageContentBody>
        </LogEntryRateSetupPageContent>
      </EuiPageBody>
    </LogEntryRateSetupPage>
  );
};

// !important due to https://github.com/elastic/eui/issues/2232
const LogEntryRateSetupPageContent = euiStyled(EuiPageContent)`
  max-width: 768px !important;
`;

const LogEntryRateSetupPage = euiStyled(EuiPage)`
  height: 100%;
`;
