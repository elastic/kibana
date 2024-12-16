/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import type { MlJobWithTimeRange } from '../../../../common/types/anomaly_detection_jobs';
import { useNotifications } from '../../contexts/kibana';
import { useJobSelectionFlyout } from '../../contexts/ml/use_job_selection_flyout';
import { useAnomalyExplorerContext } from '../../explorer/anomaly_explorer_context';

export interface JobSelection {
  jobIds: string[];
  selectedGroups: string[];
}

export const useJobSelection = (jobs: MlJobWithTimeRange[]) => {
  const { toasts: toastNotifications } = useNotifications();
  const { anomalyExplorerCommonStateService } = useAnomalyExplorerContext();

  const selectedJobs = useObservable(
    anomalyExplorerCommonStateService.selectedJobs$,
    anomalyExplorerCommonStateService.selectedJobs
  );
  const invalidJobIds = useObservable(
    anomalyExplorerCommonStateService.invalidJobIds$,
    anomalyExplorerCommonStateService.invalidJobIds
  );

  const getJobSelection = useJobSelectionFlyout();
  const selectedIds = useMemo(() => {
    return selectedJobs?.map((j) => j.id);
  }, [selectedJobs]);

  useEffect(() => {
    if (invalidJobIds.length > 0) {
      toastNotifications.addWarning(
        i18n.translate('xpack.ml.jobSelect.requestedJobsDoesNotExistWarningMessage', {
          defaultMessage: `Requested
  {invalidIdsLength, plural, one {job {invalidIds} does not exist} other {jobs {invalidIds} do not exist}}`,
          values: {
            invalidIdsLength: invalidJobIds.length,
            invalidIds: invalidJobIds.join(),
          },
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalidJobIds]);

  useEffect(() => {
    // if there are no valid ids, ask the user to provide job selection with the flyout
    if (!selectedIds || (selectedIds.length === 0 && jobs.length > 0)) {
      getJobSelection({ singleSelection: false })
        .then(({ jobIds, time }) => {
          anomalyExplorerCommonStateService.setSelectedJobs(jobIds, time);
        })
        .catch(() => {
          // flyout closed without selection
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  return { selectedIds, selectedJobs };
};
