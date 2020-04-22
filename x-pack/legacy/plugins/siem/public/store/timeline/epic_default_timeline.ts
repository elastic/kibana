/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { empty } from 'rxjs';
import { Epic } from 'redux-observable';
import { Action } from 'redux';
import { addTimeline } from './actions';
import { getDefaultTimeline } from '../../containers/timeline/api';

export const createDefaultTimelineEpic = <State>(): Epic<Action, Action, State, {}> => () => {
  console.error('default timeline epic');

  return getDefaultTimeline()
    .then(data => {
      console.error('data', data);
      addTimeline({
        id: data.id,
        timeline: data.attributes,
      });
    })
    .catch(() => empty());
};
