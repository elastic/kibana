/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import euiStyled from '../../../../../../common/eui_styled_components';
import { useTrackPageview } from '../../../hooks/use_track_metric';

import { AnalysisSetupTimerangeForm } from './analysis_setup_timerange_form';
import { CreateMLJobsButton } from './create_ml_jobs_button';

interface AnalysisSetupContentProps {
  setupMlModule: (startTime?: number | undefined, endTime?: number | undefined) => Promise<any>;
  isSettingUp: boolean;
  didSetupFail: boolean;
  isCleaningUpAFailedSetup: boolean;
  indexPattern: string;
}

const errorTitle = i18n.translate('xpack.infra.analysisSetup.errorTitle', {
  defaultMessage: 'Sorry, there was an error setting up Machine Learning',
});

export const AnalysisSetupContent: React.FunctionComponent<AnalysisSetupContentProps> = ({
  setupMlModule,
  isSettingUp,
  didSetupFail,
  isCleaningUpAFailedSetup,
  indexPattern,
}) => {
  useTrackPageview({ app: 'infra_logs', path: 'analysis_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'analysis_setup', delay: 15000 });

  const [showTimeRangeForm, setShowTimeRangeForm] = useState(false);
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
            {showTimeRangeForm ? (
              <>
                <EuiSpacer size="l" />
                <AnalysisSetupTimerangeForm
                  isSettingUp={isSettingUp}
                  setupMlModule={setupMlModule}
                />
              </>
            ) : (
              <>
                <EuiSpacer size="m" />
                <ByDefaultText>
                  <FormattedMessage
                    id="xpack.infra.analysisSetup.timeRangeByDefault"
                    defaultMessage="By default, we'll analyze all past and future log messages in your logs indices."
                  />{' '}
                  <EuiButtonEmpty onClick={() => setShowTimeRangeForm(true)}>
                    <FormattedMessage
                      id="xpack.infra.analysisSetup.configureTimeRange"
                      defaultMessage="Configure time range?"
                    />
                  </EuiButtonEmpty>
                </ByDefaultText>
                <EuiSpacer size="l" />
                <CreateMLJobsButton
                  isLoading={isSettingUp || isCleaningUpAFailedSetup}
                  onClick={() => setupMlModule()}
                />
              </>
            )}
            {didSetupFail && (
              <>
                <EuiSpacer />
                <EuiCallOut color="danger" iconType="alert" title={errorTitle}>
                  <EuiText>
                    <FormattedMessage
                      id="xpack.infra.analysisSetup.errorText"
                      defaultMessage="Please ensure ALL configured logs indices ({indexPattern}) exist. If all these indices do exist, please try again."
                      values={{
                        indexPattern,
                      }}
                    />
                    <br />
                    <br />
                    <FormattedMessage
                      id="xpack.infra.analysisSetup.steps.setupProcess.failureTextDisclaimer"
                      defaultMessage="Note: 'kibana_sample_data_logs*' indices are never included in ML analysis."
                    />
                  </EuiText>
                </EuiCallOut>
              </>
            )}
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

const ByDefaultText = euiStyled(EuiText).attrs({ size: 's' })`
  & .euiButtonEmpty {
    font-size: inherit;
    line-height: inherit;
    height: initial;
  }

  & .euiButtonEmpty__content {
    padding: 0;
  }
`;
