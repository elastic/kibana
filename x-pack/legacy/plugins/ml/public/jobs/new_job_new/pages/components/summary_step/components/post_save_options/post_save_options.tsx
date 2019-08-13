/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useContext, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { JobRunner } from '../../../../../common/job_runner';

// @ts-ignore
import { CreateWatchFlyout } from '../../../../../../jobs_list/components/create_watch_flyout';
import { JobCreatorContext } from '../../../../components/job_creator_context';
import { DATAFEED_STATE } from '../../../../../../../../common/constants/states';

interface Props {
  jobRunner: JobRunner | null;
}

type ShowFlyout = (jobId: string) => void;

export const PostSaveOptions: FC<Props> = ({ jobRunner }) => {
  const { jobCreator } = useContext(JobCreatorContext);
  const [datafeedState, setDatafeedState] = useState(DATAFEED_STATE.STOPPED);
  const [watchFlyoutVisible, setWatchFlyoutVisible] = useState(false);
  const [watchCreated, setWatchCreated] = useState(false);

  function setShowCreateWatchFlyoutFunction(showFlyout: ShowFlyout) {
    showFlyout(jobCreator.jobId);
  }

  function flyoutHidden(jobCreated: boolean) {
    setWatchFlyoutVisible(false);
    setWatchCreated(jobCreated);
  }

  function unsetShowCreateWatchFlyoutFunction() {
    setWatchFlyoutVisible(false);
  }

  async function startJobInRealTime() {
    setDatafeedState(DATAFEED_STATE.STARTING);
    if (jobRunner !== null) {
      const started = await jobRunner.startDatafeedInRealTime();
      setDatafeedState(started === true ? DATAFEED_STATE.STARTED : DATAFEED_STATE.STOPPED);
    }
  }

  return (
    <Fragment>
      &emsp;
      <EuiButton
        isDisabled={
          datafeedState === DATAFEED_STATE.STARTING || datafeedState === DATAFEED_STATE.STARTED
        }
        onClick={startJobInRealTime}
        data-test-subj="mlButtonUseFullData3"
      >
        <FormattedMessage
          id="xpack.ml.fullTimeRangeSelector.useFullDataButtonLabe2"
          defaultMessage="Start job running in real time"
        />
      </EuiButton>
      &emsp;
      <EuiButton
        isDisabled={
          datafeedState === DATAFEED_STATE.STOPPED ||
          datafeedState === DATAFEED_STATE.STARTING ||
          watchCreated === true
        }
        onClick={() => setWatchFlyoutVisible(true)}
        data-test-subj="mlButtonUseFullData"
      >
        <FormattedMessage
          id="xpack.ml.fullTimeRangeSelector.useFullDataButtonLabel"
          defaultMessage="Create watch"
        />
      </EuiButton>
      {datafeedState === DATAFEED_STATE.STARTED && watchFlyoutVisible && (
        <CreateWatchFlyout
          setShowFunction={setShowCreateWatchFlyoutFunction}
          unsetShowFunction={unsetShowCreateWatchFlyoutFunction}
          flyoutHidden={flyoutHidden}
        />
      )}
    </Fragment>
  );
};
