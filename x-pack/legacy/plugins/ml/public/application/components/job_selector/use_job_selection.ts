/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { difference } from 'lodash';
import { useEffect } from 'react';

import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';

import { MlJobWithTimeRange } from '../../../../common/types/jobs';

import { useUrlState } from '../../util/url_state';

import { getTimeRangeFromSelection } from './job_select_service_utils';

// check that the ids read from the url exist by comparing them to the
// jobs loaded via mlJobsService.
function getInvalidJobIds(jobs: MlJobWithTimeRange[], ids: string[]) {
  return ids.filter(id => {
    const jobExists = jobs.some(job => job.job_id === id);
    return jobExists === false && id !== '*';
  });
}

function warnAboutInvalidJobIds(invalidIds: string[]) {
  if (invalidIds.length > 0) {
    toastNotifications.addWarning(
      i18n.translate('xpack.ml.jobSelect.requestedJobsDoesNotExistWarningMessage', {
        defaultMessage: `Requested
{invalidIdsLength, plural, one {job {invalidIds} does not exist} other {jobs {invalidIds} do not exist}}`,
        values: {
          invalidIdsLength: invalidIds.length,
          invalidIds: invalidIds.join(),
        },
      })
    );
  }
}

export interface JobSelection {
  jobIds: string[];
  selectedGroups: string[];
}

export const useJobSelection = (jobs: MlJobWithTimeRange[], dateFormatTz: string) => {
  const [globalState, setGlobalState] = useUrlState('_g');

  const jobSelection: JobSelection = { jobIds: [], selectedGroups: [] };

  const ids = globalState?.ml?.jobIds || [];
  const tmpIds = (typeof ids === 'string' ? [ids] : ids).map((id: string) => String(id));
  const invalidIds = getInvalidJobIds(jobs, tmpIds);
  const validIds = difference(tmpIds, invalidIds);
  validIds.sort();

  jobSelection.jobIds = validIds;
  jobSelection.selectedGroups = globalState?.ml?.groups ?? [];

  useEffect(() => {
    warnAboutInvalidJobIds(invalidIds);
  }, [invalidIds]);

  useEffect(() => {
    // if there are no valid ids, warn and then select the first job
    if (validIds.length === 0 && jobs.length > 0) {
      toastNotifications.addWarning(
        i18n.translate('xpack.ml.jobSelect.noJobsSelectedWarningMessage', {
          defaultMessage: 'No jobs selected, auto selecting first job',
        })
      );

      const mlGlobalState = globalState?.ml || {};
      mlGlobalState.jobIds = [jobs[0].job_id];

      const time = getTimeRangeFromSelection(jobs, mlGlobalState.jobIds);

      setGlobalState({
        ...{ ml: mlGlobalState },
        ...(time !== undefined ? { time } : {}),
      });
    }
  }, [jobs, validIds]);

  return jobSelection;
};
