/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import actionCreatorFactory from 'typescript-fsa';
import { DataProvider } from '../../../common';

const actionCreator = actionCreatorFactory('x-pack/timelines/timeline');

export const addProviderToTimeline = actionCreator<{ id: string; dataProvider: DataProvider }>(
  'ADD_PROVIDER_TO_TIMELINE'
);
