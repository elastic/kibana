/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePermissionCheck } from '../../../../capabilities/check_capabilities';
import { JobSpacesSyncFlyout } from '../../../../components/job_spaces_sync';

export const SynchronizeSavedObjectsButton = ({ refreshJobs }: { refreshJobs: () => void }) => {
  const [showSyncFlyout, setShowSyncFlyout] = useState(false);
  function onCloseSyncFlyout() {
    if (typeof refreshJobs === 'function') {
      refreshJobs();
    }
    setShowSyncFlyout(false);
  }
  const [canCreateJob, canCreateDataFrameAnalytics, canCreateTrainedModels] = usePermissionCheck([
    'canCreateJob',
    'canCreateDataFrameAnalytics',
    'canCreateTrainedModels',
  ]);

  const canSync = useMemo(
    () => canCreateJob || canCreateDataFrameAnalytics || canCreateTrainedModels,
    [canCreateDataFrameAnalytics, canCreateJob, canCreateTrainedModels]
  );

  return (
    <>
      <EuiButtonEmpty
        disabled={!canSync}
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
