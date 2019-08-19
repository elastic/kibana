/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';
import moment, { Moment } from 'moment';
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
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiDatePicker,
  EuiFlexGroup,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import euiStyled from '../../../../../../common/eui_styled_components';
import { useTrackPageview } from '../../../hooks/use_track_metric';

interface AnalysisSetupContentProps {
  setupMlModule: (startTime: number | undefined, endTime: number | undefined) => Promise<any>;
  isSettingUp: boolean;
  didSetupFail: boolean;
}

const startTimeLabel = i18n.translate('xpack.infra.analysisSetup.startTimeLabel', {
  defaultMessage: 'Start time',
});
const endTimeLabel = i18n.translate('xpack.infra.analysisSetup.endTimeLabel', {
  defaultMessage: 'End time',
});
const startTimeDefaultDescription = i18n.translate(
  'xpack.infra.analysisSetup.startTimeDefaultDescription',
  {
    defaultMessage: 'Start of log indices',
  }
);
const endTimeDefaultDescription = i18n.translate(
  'xpack.infra.analysisSetup.endTimeDefaultDescription',
  {
    defaultMessage: 'Indefinitely',
  }
);
const errorTitle = i18n.translate('xpack.infra.analysisSetup.errorTitle', {
  defaultMessage: 'Sorry, there was an error setting up Machine Learning',
});

function selectedDateToParam(selectedDate: Moment | null) {
  if (selectedDate) {
    return selectedDate.valueOf(); // To ms unix timestamp
  }
  return undefined;
}

export const AnalysisSetupContent: React.FunctionComponent<AnalysisSetupContentProps> = ({
  setupMlModule,
  isSettingUp,
  didSetupFail,
}) => {
  useTrackPageview({ app: 'infra_logs', path: 'analysis_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'analysis_setup', delay: 15000 });

  const [startTime, setStartTime] = useState<Moment | null>(null);
  const [endTime, setEndTime] = useState<Moment | null>(null);

  const now = useMemo(() => moment(), []);
  const selectedEndTimeIsToday = !endTime || endTime.isSame(now, 'day');

  const onClickCreateJob = () =>
    setupMlModule(selectedDateToParam(startTime), selectedDateToParam(endTime));

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
                defaultMessage="Use Machine Learning to automatically detect anomalous log rate counts"
              />
            </EuiText>
            <EuiSpacer size="l" />
            <EuiDescribedFormGroup
              idAria="timeRange"
              title={
                <FormattedMessage
                  id="xpack.infra.analysisSetup.timeRangeTitle"
                  defaultMessage="Choose a time range"
                />
              }
              description={
                <FormattedMessage
                  id="xpack.infra.analysisSetup.timeRangeDescription"
                  defaultMessage="By default, Machine Learning analyzes log messages from the start of your log indices and continues indefinitely. You can specify a different date to begin, to end, or both."
                />
              }
            >
              <EuiFormRow
                describedByIds={['timeRange']}
                error={false}
                fullWidth
                isInvalid={false}
                label={startTimeLabel}
              >
                <EuiFlexGroup gutterSize="s">
                  <EuiDatePicker
                    showTimeSelect
                    selected={startTime}
                    onChange={setStartTime}
                    placeholder={startTimeDefaultDescription}
                    maxDate={now}
                    onClear={() => setStartTime(null)}
                  />
                </EuiFlexGroup>
              </EuiFormRow>
              <EuiFormRow
                describedByIds={['timeRange']}
                error={false}
                fullWidth
                isInvalid={false}
                label={endTimeLabel}
              >
                <EuiFlexGroup gutterSize="s">
                  <EuiDatePicker
                    showTimeSelect
                    selected={endTime}
                    onChange={setEndTime}
                    placeholder={endTimeDefaultDescription}
                    openToDate={now}
                    minDate={now}
                    minTime={
                      selectedEndTimeIsToday
                        ? now
                        : moment()
                            .hour(0)
                            .minutes(0)
                    }
                    maxTime={moment()
                      .hour(23)
                      .minutes(59)}
                    onClear={() => setEndTime(null)}
                  />
                </EuiFlexGroup>
              </EuiFormRow>
              <EuiButton
                fill
                isLoading={isSettingUp}
                iconSide="right"
                iconType="check"
                onClick={onClickCreateJob}
              >
                <FormattedMessage
                  id="xpack.infra.analysisSetup.createMlJobButton"
                  defaultMessage="Create ML Job"
                />
              </EuiButton>
            </EuiDescribedFormGroup>
            {didSetupFail && (
              <EuiCallOut color="danger" iconType="alert" title={errorTitle}>
                <EuiText>
                  <FormattedMessage
                    id="xpack.infra.analysisSetup.errorText"
                    defaultMessage="Please try again"
                  />
                </EuiText>
              </EuiCallOut>
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
