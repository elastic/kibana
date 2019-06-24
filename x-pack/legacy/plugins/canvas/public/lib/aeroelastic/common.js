/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { select } from './select';

// serves as reminder that we start with the state
// todo remove it as we add TS annotations (State)
const state = d => d;

const getScene = state => state.currentScene;
export const scene = select(getScene)(state);

const getPrimaryUpdate = state => state.primaryUpdate;
export const primaryUpdate = select(getPrimaryUpdate)(state);
