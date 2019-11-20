/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { from } from 'rxjs';
import { map } from 'rxjs/operators';

import { mlFieldFormatService } from '../services/field_format_service';
import { mlJobService } from '../services/job_service';
import { TimeBucketsInterval } from '../util/time_buckets';

import { EXPLORER_ACTION } from './explorer_constants';
import { explorerAction$, ExplorerAppState } from './explorer_dashboard_service';
import {
  createJobs,
  loadOverallData,
  restoreAppState,
  ExplorerJob,
  TimeRangeBounds,
} from './explorer_utils';

export function jobSelectionActionCreator(
  actionName: string,
  selectedJobIds: string[],
  appState: ExplorerAppState
) {
  return from(mlFieldFormatService.populateFormats(selectedJobIds)).pipe(
    map(resp => {
      if (resp.err) {
        console.log('Error populating field formats:', resp.err); // eslint-disable-line no-console
        return null;
      }

      const { selectedCells, filterData } = restoreAppState(appState);

      const jobs = createJobs(mlJobService.jobs).map(job => {
        job.selected = selectedJobIds.some(id => job.id === id);
        return job;
      });

      const selectedJobs = jobs.filter(job => job.selected);

      const noJobsFound = jobs.length === 0;

      return {
        action: actionName,
        payload: {
          loading: false,
          noJobsFound,
          selectedCells,
          selectedJobs,
          swimlaneViewByFieldName: appState.mlExplorerSwimlane.viewByFieldName,
          filterData,
        },
      };
    })
  );
}

// Load the overall data - if the FieldFormats failed to populate
// the default formatting will be used for metric values.
export function loadOverallDataActionCreator(
  selectedJobs: ExplorerJob[],
  swimlaneBucketInterval: TimeBucketsInterval,
  bounds: TimeRangeBounds,
  showOverallLoadingIndicator = true
) {
  if (showOverallLoadingIndicator) {
    explorerAction$.next({
      action: EXPLORER_ACTION.SET_STATE,
      payload: { hasResults: false, loading: true },
    });
  }

  return from(loadOverallData(selectedJobs, swimlaneBucketInterval, bounds)).pipe(
    map(payload => ({ action: EXPLORER_ACTION.SET_STATE, payload }))
  );
}
