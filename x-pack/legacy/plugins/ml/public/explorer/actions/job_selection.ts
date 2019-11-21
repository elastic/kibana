/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';

import { forkJoin, from } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';

import { mlFieldFormatService } from '../../services/field_format_service';
import { mlJobService } from '../../services/job_service';
import { formatHumanReadableDateTime } from '../../util/date_utils';
import { TimeBucketsInterval } from '../../util/time_buckets';

import { EXPLORER_ACTION, SWIMLANE_TYPE } from '../explorer_constants';
import { explorerAction$, ExplorerAppState } from '../explorer_dashboard_service';
import {
  createJobs,
  getClearedSelectedAnomaliesState,
  getDefaultViewBySwimlaneData,
  loadOverallData,
  loadViewBySwimlane,
  loadViewByTopFieldValuesForSelectedTime,
  restoreAppState,
  ExplorerJob,
  TimeRangeBounds,
} from '../explorer_utils';

const memoizeIsEqual = (newArgs: any[], lastArgs: any[]) => isEqual(newArgs, lastArgs);

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
        type: actionName,
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
