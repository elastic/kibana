/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AnalysisSetupTimerangeForm } from '../analysis_setup_timerange_form';

interface InitialConfigurationProps {
  setStartTime: (startTime: number | undefined) => void;
  setEndTime: (endTime: number | undefined) => void;
  startTime: number | undefined;
  endTime: number | undefined;
}

export const InitialConfiguration: React.FunctionComponent<InitialConfigurationProps> = ({
  setStartTime,
  setEndTime,
  startTime,
  endTime,
}: InitialConfigurationProps) => {
  const [showTimeRangeForm, setShowTimeRangeForm] = useState(false);
  return (
    <>
      {showTimeRangeForm ? (
        <>
          <EuiSpacer size="l" />
          <AnalysisSetupTimerangeForm
            setStartTime={setStartTime}
            setEndTime={setEndTime}
            startTime={startTime}
            endTime={endTime}
          />
        </>
      ) : (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.infra.analysisSetup.timeRangeByDefault"
              defaultMessage="By default, Machine Learning will analyze all past and future log messages in your logs indices."
            />{' '}
            <EuiLink
              onClick={e => {
                e.preventDefault();
                setShowTimeRangeForm(true);
              }}
            >
              <FormattedMessage
                id="xpack.infra.analysisSetup.configureTimeRange"
                defaultMessage="Configure time range?"
              />
            </EuiLink>
          </EuiText>
        </>
      )}
    </>
  );
};
