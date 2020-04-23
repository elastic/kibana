/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { empty, of, merge } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import { map } from 'rxjs/operators';
import { Epic } from 'redux-observable';
import { Action } from 'redux';
import { addTimeline } from './actions';
import { getDefaultTimeline, decodeTimelineResponse } from '../../containers/timeline/api';

export const createDefaultTimelineEpic = <State>(): Epic<Action, Action, State> => () => {
  console.error('default timeline epic');

  return ajax.getJSON('/api/timeline/_default').pipe(
    map(resp => {
      console.error('resp', resp);
      return addTimeline({ id: 'timeline-1', timeline: resp.data.persistTimeline.timeline });
    })
  );

  // return of(getDefaultTimeline()).pipe(
  //   map(resp => {
  //     console.error('resp', resp);

  //     return addTimeline({ id: 'timeline-1', timeline: resp.data.persistTimeline.timeline });
  //   })
  // );
};
