/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineEpics } from 'redux-observable';

import { createLogPositionEpic } from './log_position';
import { createWaffleTimeEpic } from './waffle_time';

export const createLocalEpic = <State>() =>
  combineEpics(createLogPositionEpic<State>(), createWaffleTimeEpic<State>());
