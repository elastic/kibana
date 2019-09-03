/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineEpics } from 'redux-observable';

import { createLocalEpic } from './local';
import { createRemoteEpic } from './remote';

export const createRootEpic = <State>() =>
  combineEpics(createLocalEpic<State>(), createRemoteEpic<State>());
