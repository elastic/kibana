/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { useTrackPageview } from '../../../hooks/use_track_metric';
import { LogEntryRateSetupSteps } from './setup';
import {
  LogAnalysisSetupPage,
  LogAnalysisSetupPageHeader,
  LogAnalysisSetupPageContent,
} from '../../../components/logging/log_analysis_setup';
import { useLogEntryRateModuleContext } from './use_log_entry_rate_module';

export const LogEntryRateSetupContent: React.FunctionComponent = () => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup', delay: 15000 });

  const {
    cleanUpAndSetUpModule,
    lastSetupErrorMessages,
    moduleDescriptor,
    sourceConfiguration,
    setUpModule,
    setupStatus,
    viewResults,
  } = useLogEntryRateModuleContext();

  return (
    <LogAnalysisSetupPage data-test-subj="logEntryRateSetupPage">
      <LogAnalysisSetupPageHeader>
        <FormattedMessage
          id="xpack.infra.analysisSetup.analysisSetupTitle"
          defaultMessage="Enable Machine Learning analysis"
        />
      </LogAnalysisSetupPageHeader>
      <LogAnalysisSetupPageContent>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.infra.analysisSetup.analysisSetupDescription"
            defaultMessage="Use Machine Learning to automatically detect anomalous log rate counts."
          />
        </EuiText>
        <EuiSpacer />
        <LogEntryRateSetupSteps
          cleanupAndSetup={cleanUpAndSetUpModule}
          errorMessages={lastSetupErrorMessages}
          setup={setUpModule}
          setupStatus={setupStatus}
          viewResults={viewResults}
          moduleDescriptor={moduleDescriptor}
          sourceConfiguration={sourceConfiguration}
        />
      </LogAnalysisSetupPageContent>
    </LogAnalysisSetupPage>
  );
};
