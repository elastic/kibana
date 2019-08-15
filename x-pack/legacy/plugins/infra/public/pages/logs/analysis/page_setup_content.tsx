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
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import euiStyled from '../../../../../../common/eui_styled_components';
import { useTrackPageview } from '../../../hooks/use_track_metric';

interface AnalysisSetupContentProps {
  onCreateJobs: () => void;
  isSettingUp: boolean;
}

export const AnalysisSetupContent: React.FunctionComponent<AnalysisSetupContentProps> = ({
  onCreateJobs,
  isSettingUp,
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
                defaultMessage="Use Machine Learning to automatically categorize log messages, and detect anomalous event counts and rare log messages."
              />
            </EuiText>
            <EuiSpacer size="m" />

            <EuiButton
              fill
              isLoading={isSettingUp}
              iconSide="right"
              iconType="check"
              onClick={onCreateJobs}
            >
              <FormattedMessage
                id="xpack.infra.analysisSetup.createMlJobButton"
                defaultMessage="Create ML Job"
              />
            </EuiButton>
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
