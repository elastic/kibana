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
import { AnalysisSetupSteps } from './setup/steps';

interface AnalysisSetupContentProps {
  setup: (startTime?: number | undefined, endTime?: number | undefined) => void;
  retry: (startTime?: number | undefined, endTime?: number | undefined) => void;
  indexPattern: string;
  viewResults: () => void;
  setupStatus: SetupStatus;
}

export const AnalysisSetupContent: React.FunctionComponent<AnalysisSetupContentProps> = ({
  setup,
  indexPattern,
  viewResults,
  retry,
  setupStatus,
}) => {
  useTrackPageview({ app: 'infra_logs', path: 'analysis_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'analysis_setup', delay: 15000 });

  return (
    <AnalysisSetupPage>
      <EuiPageBody>
        <AnalysisPageContent
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
            <AnalysisSetupSteps
              setup={setup}
              retry={retry}
              viewResults={viewResults}
              indexPattern={indexPattern}
              setupStatus={setupStatus}
            />
          </EuiPageContentBody>
        </AnalysisPageContent>
      </EuiPageBody>
    </AnalysisSetupPage>
  );
};

// !important due to https://github.com/elastic/eui/issues/2232
const AnalysisPageContent = euiStyled(EuiPageContent)`
  max-width: 518px !important;
`;

const AnalysisSetupPage = euiStyled(EuiPage)`
  height: 100%;
`;
