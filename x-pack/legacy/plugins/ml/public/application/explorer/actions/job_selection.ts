/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { from } from 'rxjs';
import { map } from 'rxjs/operators';

import { mlFieldFormatService } from '../../services/field_format_service';
import { mlJobService } from '../../services/job_service';

import { createJobs, RestoredAppState } from '../explorer_utils';

export function jobSelectionActionCreator(
  actionName: string,
  selectedJobIds: string[],
  { filterData, selectedCells, viewBySwimlaneFieldName }: RestoredAppState
) {
  return from(mlFieldFormatService.populateFormats(selectedJobIds)).pipe(
    map(resp => {
      if (resp.err) {
        console.log('Error populating field formats:', resp.err); // eslint-disable-line no-console
        return null;
      }

      const jobs = createJobs(mlJobService.jobs).map(job => {
        job.selected = selectedJobIds.some(id => job.id === id);
        return job;
      });

      const selectedJobs = jobs.filter(job => job.selected);

      return {
        type: actionName,
        payload: {
          loading: false,
          selectedCells,
          selectedJobs,
          viewBySwimlaneFieldName,
          filterData,
        },
      };
    })
  );
}
