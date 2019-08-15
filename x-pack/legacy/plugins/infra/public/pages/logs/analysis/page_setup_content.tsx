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
  EuiButtonIcon,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiDatePicker,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import euiStyled from '../../../../../../common/eui_styled_components';
import { useTrackPageview } from '../../../hooks/use_track_metric';

interface AnalysisSetupContentProps {
  setupMlModule: (startTime: number | undefined, endTime: number | undefined) => Promise<any>;
  isSettingUp: boolean;
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
    defaultMessage: 'now',
  }
);
const endTimeDefaultDescription = i18n.translate(
  'xpack.infra.analysisSetup.endTimeDefaultDescription',
  {
    defaultMessage: 'indefinitely',
  }
);
const clearStartTimeLabel = i18n.translate('xpack.infra.analysisSetup.clearStartTimeLabel', {
  defaultMessage: 'Clear start time',
});
const clearEndTimeLabel = i18n.translate('xpack.infra.analysisSetup.clearEndTimeLabel', {
  defaultMessage: 'Clear end time',
});

function selectedDateToParam(selectedDate: Moment | null) {
  if (selectedDate) {
    return selectedDate.unix();
  }
  return undefined;
}

export const AnalysisSetupContent: React.FunctionComponent<AnalysisSetupContentProps> = ({
  setupMlModule,
  isSettingUp,
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
                defaultMessage="Use Machine Learning to automatically categorize log messages, and detect anomalous event counts and rare log messages."
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
                  defaultMessage="By default, Machine Learning will analyze log messages starting now and continue indefinitely. You can specify an earlier date to begin, a specific point in time to end, or both."
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
                  />
                  {startTime && (
                    <EuiButtonIcon
                      color="danger"
                      iconType="cross"
                      aria-label={clearStartTimeLabel}
                      onClick={() => setStartTime(null)}
                    />
                  )}
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
                  />
                  {endTime && (
                    <EuiButtonIcon
                      color="danger"
                      iconType="cross"
                      aria-label={clearEndTimeLabel}
                      onClick={() => setEndTime(null)}
                    />
                  )}
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
