/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { SetupStatus } from '../../../../common/log_analysis';
import { ModuleDescriptor, ModuleSourceConfiguration } from '../../../containers/logs/log_analysis';
import { useTrackPageview } from '../../../hooks/use_track_metric';
import { LogEntryRateSetupSteps } from './setup';

type SetupHandler = (
  indices: string[],
  startTime: number | undefined,
  endTime: number | undefined
) => void;

interface LogEntryRateSetupContentProps<JobType extends string> {
  cleanupAndSetup: SetupHandler;
  errorMessages: string[];
  moduleDescriptor: ModuleDescriptor<JobType>;
  setup: SetupHandler;
  setupStatus: SetupStatus;
  sourceConfiguration: ModuleSourceConfiguration;
  viewResults: () => void;
}

export const LogEntryRateSetupContent = <JobType extends string>({
  cleanupAndSetup,
  errorMessages,
  setup,
  setupStatus,
  viewResults,
  moduleDescriptor,
  sourceConfiguration,
}: LogEntryRateSetupContentProps<JobType>) => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup', delay: 15000 });

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
              cleanupAndSetup={cleanupAndSetup}
              errorMessages={errorMessages}
              setup={setup}
              setupStatus={setupStatus}
              viewResults={viewResults}
              moduleDescriptor={moduleDescriptor}
              sourceConfiguration={sourceConfiguration}
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
