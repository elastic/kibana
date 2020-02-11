/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { State } from './model';

const actionCreator = actionCreatorFactory('x-pack/siem/local/ui_settings');

export const indexPatternsChanged = actionCreator<State['indexPattern']>('INDEX_PATTERN_CHANGED');
export const dateFormatChanged = actionCreator<State['dateFormat']>('DATE_FORMAT_CHANGED');
