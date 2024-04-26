/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { batch } from 'react-redux';

import type { HttpSetup, HttpFetchOptions } from '@kbn/core/public';
import { fetchStream } from '.';

export const startStream = createAsyncThunk(
  'startStream',
  async (
    options: {
      http: HttpSetup;
      endpoint: string;
      apiVersion?: string;
      abortCtrl: React.MutableRefObject<AbortController>;
      body?: any;
      headers?: HttpFetchOptions['headers'];
    },
    { dispatch, getState }
  ) => {
    const { http, endpoint, apiVersion, abortCtrl, body, headers } = options;
    const state = getState() as StreamState;

    if (state.isRunning) {
      dispatch(addError('Instant restart while running not supported yet.'));
      return;
    }

    batch(() => {
      dispatch(resetErrors());
      dispatch(setIsRunning(true));
      dispatch(setIsCancelled(false));
    });

    for await (const [fetchStreamError, actions] of fetchStream(
      http,
      endpoint,
      apiVersion,
      abortCtrl,
      body,
      true,
      headers
    )) {
      if (fetchStreamError !== null) {
        dispatch(addError(fetchStreamError));
      } else if (Array.isArray(actions) && actions.length > 0) {
        batch(() => {
          for (const action of actions) {
            dispatch(action);
          }
        });
      }
    }

    dispatch(setIsRunning(false));
  }
);

interface StreamState {
  errors: string[];
  isCancelled: boolean;
  isRunning: boolean;
}

function getDefaultState(): StreamState {
  return {
    errors: [],
    isCancelled: false,
    isRunning: false,
  };
}

export const streamSlice = createSlice({
  name: 'stream',
  initialState: getDefaultState(),
  reducers: {
    addError: (state: StreamState, action: PayloadAction<string>) => {
      state.errors.push(action.payload);
    },
    cancelStream: (state: StreamState) => {
      state.isCancelled = true;
      state.isRunning = false;
    },
    resetErrors: (state: StreamState) => {
      state.errors = [];
    },
    setIsCancelled: (state: StreamState, action: PayloadAction<boolean>) => {
      state.isCancelled = action.payload;
    },
    setIsRunning: (state: StreamState, action: PayloadAction<boolean>) => {
      state.isRunning = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { addError, cancelStream, resetErrors, setIsCancelled, setIsRunning } =
  streamSlice.actions;
