/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureStore } from '@reduxjs/toolkit';
import processingSimulatorReducer from './processing_simulator/processing_simulator_slice';
import definitionReducer from './definition/definition_slice';

export const store = configureStore({
  reducer: {
    processingSimulator: processingSimulatorReducer,
    definition: definitionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
