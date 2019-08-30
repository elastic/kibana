/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { Moment } from 'moment';
import { EuiButtonEmpty, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AnalysisSetupTimerangeForm } from '../analysis_setup_timerange_form';
import euiStyled from '../../../../../../../../common/eui_styled_components';
import { CreateMLJobsButton } from '../create_ml_jobs_button';

interface InitialConfigurationProps {
  setupMlModule: () => Promise<any>;
  hasAttemptedSetup: boolean;
  setStartTime: (startTime: Moment | null) => void;
  setEndTime: (endTime: Moment | null) => void;
  startTime: Moment | null;
  endTime: Moment | null;
}

export const InitialConfiguration: React.FunctionComponent<InitialConfigurationProps> = ({
  setupMlModule,
  hasAttemptedSetup,
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
            setupMlModule={setupMlModule}
            hasAttemptedSetup={hasAttemptedSetup}
            setStartTime={setStartTime}
            setEndTime={setEndTime}
            startTime={startTime}
            endTime={endTime}
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
          <CreateMLJobsButton isDisabled={hasAttemptedSetup} onClick={() => setupMlModule()} />
        </>
      )}
    </>
  );
};

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
