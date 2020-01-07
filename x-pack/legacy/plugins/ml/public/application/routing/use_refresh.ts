/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useObservable } from 'react-use';
import { merge } from 'rxjs';
import { map } from 'rxjs/operators';

import { annotationsRefresh$ } from '../services/annotations_service';
import {
  mlTimefilterRefresh$,
  mlTimefilterTimeChange$,
} from '../services/timefilter_refresh_service';

interface Refresh {
  timeRange?: { start: string; end: string };
  lastRefresh: number;
}

const refresh$ = merge(
  mlTimefilterRefresh$,
  mlTimefilterTimeChange$,
  annotationsRefresh$.pipe(map(d => ({ lastRefresh: d })))
);

export const useRefresh = () => {
  return useObservable<Refresh>(refresh$);
};
