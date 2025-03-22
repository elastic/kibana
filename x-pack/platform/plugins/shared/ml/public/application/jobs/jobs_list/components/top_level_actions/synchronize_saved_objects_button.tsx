/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { JobSpacesSyncFlyout } from '../../../../components/job_spaces_sync';

export const SynchronizeSavedObjectsButton = ({ refreshJobs }: { refreshJobs: () => void }) => {
  const [showSyncFlyout, setShowSyncFlyout] = useState(false);
  function onCloseSyncFlyout() {
    if (typeof refreshJobs === 'function') {
      refreshJobs();
    }
    setShowSyncFlyout(false);
  }

  return (
    <>
      <EuiButtonEmpty
        size="m"
        flush="left"
        iconType="inputOutput"
        onClick={() => setShowSyncFlyout(true)}
        data-test-subj="mlStackMgmtSyncButton"
      >
        <FormattedMessage
          id="xpack.ml.management.jobsList.syncFlyoutButton"
          defaultMessage="Synchronize saved objects"
        />
      </EuiButtonEmpty>
      {showSyncFlyout && <JobSpacesSyncFlyout onClose={onCloseSyncFlyout} />}
    </>
  );
};
