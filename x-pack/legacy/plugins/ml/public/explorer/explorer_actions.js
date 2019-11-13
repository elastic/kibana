/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { mlFieldFormatService } from '../services/field_format_service';
import { mlJobService } from '../services/job_service';

import { EXPLORER_ACTION } from './explorer_constants';
import { createJobs, restoreAppState } from './explorer_utils';

export function jobSelectionActionCreator(actionName, selectedJobIds, appState) {
  return from(mlFieldFormatService.populateFormats(selectedJobIds)).pipe(
    catchError(error => of({ error })),
    map(resp => {
      if (resp.error) {
        console.log('Error populating field formats:', resp.error);
        return { action: EXPLORER_ACTION.FIELD_FORMATS_LOADED };
      }

      const { selectedCells, filterData } = restoreAppState(appState);

      const jobs = createJobs(mlJobService.jobs).map((job) => {
        job.selected = selectedJobIds.some((id) => job.id === id);
        return job;
      });

      const selectedJobs = jobs.filter(job => job.selected);

      const noJobsFound = (jobs.length === 0);

      const payload = from([{
        action: actionName,
        payload: {
          loading: false,
          noJobsFound,
          selectedCells,
          selectedJobs,
          swimlaneViewByFieldName: appState.mlExplorerSwimlane.viewByFieldName,
          filterData
        }
      }]);

      return { action: EXPLORER_ACTION.FIELD_FORMATS_LOADED, payload };
    })
  );
}
