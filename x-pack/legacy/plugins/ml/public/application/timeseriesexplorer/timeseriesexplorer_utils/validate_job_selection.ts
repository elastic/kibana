/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { difference, without } from 'lodash';

import { i18n } from '@kbn/i18n';

import { getToastNotifications } from '../../util/dependency_cache';

import { MlJobWithTimeRange } from '../../../../common/types/jobs';

import { getTimeRangeFromSelection } from '../../components/job_selector/job_select_service_utils';
import { mlJobService } from '../../services/job_service';

import { createTimeSeriesJobData } from './timeseriesexplorer_utils';

/**
 * returns true/false if setGlobalState has been triggered
 * or returns the job id which should be loaded.
 */
export function validateJobSelection(
  jobsWithTimeRange: MlJobWithTimeRange[],
  selectedJobIds: string[],
  setGlobalState: (...args: any) => void
) {
  const toastNotifications = getToastNotifications();
  const jobs = createTimeSeriesJobData(mlJobService.jobs);
  const timeSeriesJobIds: string[] = jobs.map((j: any) => j.id);

  // Check if any of the jobs set in the URL are not time series jobs
  // (e.g. if switching to this view straight from the Anomaly Explorer).
  const invalidIds: string[] = difference(selectedJobIds, timeSeriesJobIds);
  const validSelectedJobIds = without(selectedJobIds, ...invalidIds);
  if (invalidIds.length > 0) {
    let warningText = i18n.translate(
      'xpack.ml.timeSeriesExplorer.canNotViewRequestedJobsWarningMessage',
      {
        defaultMessage: `You can't view requested {invalidIdsCount, plural, one {job} other {jobs}} {invalidIds} in this dashboard`,
        values: {
          invalidIdsCount: invalidIds.length,
          invalidIds: invalidIds.join(', '),
        },
      }
    );
    if (validSelectedJobIds.length === 0 && timeSeriesJobIds.length > 0) {
      warningText += i18n.translate('xpack.ml.timeSeriesExplorer.autoSelectingFirstJobText', {
        defaultMessage: ', auto selecting first job',
      });
    }
    toastNotifications.addWarning(warningText);
  }

  if (validSelectedJobIds.length > 1) {
    // if more than one job, select the first job from the selection.
    toastNotifications.addWarning(
      i18n.translate('xpack.ml.timeSeriesExplorer.youCanViewOneJobAtTimeWarningMessage', {
        defaultMessage: 'You can only view one job at a time in this dashboard',
      })
    );
    setGlobalState('ml', { jobIds: [validSelectedJobIds[0]] });
    return true;
  } else if (invalidIds.length > 0 && validSelectedJobIds.length > 0) {
    // if some ids have been filtered out because they were invalid.
    // refresh the URL with the first valid id
    setGlobalState('ml', { jobIds: [validSelectedJobIds[0]] });
    return true;
  } else if (validSelectedJobIds.length === 1) {
    // normal behavior. a job ID has been loaded from the URL
    // Clear the detectorIndex, entities and forecast info.
    return validSelectedJobIds[0];
  } else if (validSelectedJobIds.length === 0 && jobs.length > 0) {
    // no jobs were loaded from the URL, so add the first job
    // from the full jobs list.
    const jobIds = [jobs[0].id];
    const time = getTimeRangeFromSelection(jobsWithTimeRange, jobIds);
    setGlobalState({
      ...{ ml: { jobIds } },
      ...(time !== undefined ? { time } : {}),
    });
    return true;
  } else {
    // Jobs exist, but no time series jobs.
    return false;
  }
}
