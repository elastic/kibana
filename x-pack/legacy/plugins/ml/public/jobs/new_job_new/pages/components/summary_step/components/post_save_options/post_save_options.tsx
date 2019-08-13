/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useContext, useState } from 'react';
import { toastNotifications } from 'ui/notify';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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
      try {
        const started = await jobRunner.startDatafeedInRealTime();
        setDatafeedState(started === true ? DATAFEED_STATE.STARTED : DATAFEED_STATE.STOPPED);
        toastNotifications.addSuccess({
          title: i18n.translate('xpack.ml.newJob.wizard.createJobErrordw', {
            defaultMessage: `Job ${jobCreator.jobId} started`,
          }),
        });
      } catch (error) {
        setDatafeedState(DATAFEED_STATE.STOPPED);
        toastNotifications.addDanger({
          title: i18n.translate('xpack.ml.newJob.wizard.createJobErrorw', {
            defaultMessage: `Error starting job`,
          }),
          text: error.message,
        });
      }
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
          id="xpack.ml.fullTimeRangeSelector.useFullDataButtonLabel3"
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
