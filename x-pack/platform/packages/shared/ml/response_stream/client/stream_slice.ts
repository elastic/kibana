/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction, PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { batch } from 'react-redux';

import type { HttpSetup, HttpFetchOptions } from '@kbn/core/public';
import { fetchStream } from './fetch_stream';
import { DATA_THROTTLE_MS } from './constants';

/**
 * Async thunk to start the stream.
 */
export const startStream = createAsyncThunk(
  'stream/start',
  async (
    options: {
      http: HttpSetup;
      endpoint: string;
      apiVersion?: string;
      abortCtrl: React.MutableRefObject<AbortController>;
      body?: any;
      headers?: HttpFetchOptions['headers'];
    },
    thunkApi
  ) => {
    const { http, endpoint, apiVersion, abortCtrl, body, headers } = options;

    const fetchState = { isActive: true };

    // Custom buffering to avoid hammering the DOM with updates.
    // We can revisit this once Kibana is on React 18.
    const actionBuffer: AnyAction[] = [];
    function flushBuffer(withTimeout = true) {
      batch(() => {
        for (const action of actionBuffer) {
          thunkApi.dispatch(action);
        }
      });
      actionBuffer.length = 0;

      if (withTimeout) {
        setTimeout(() => {
          if (fetchState.isActive) {
            flushBuffer();
          }
        }, DATA_THROTTLE_MS);
      }
    }

    flushBuffer();

    for await (const [fetchStreamError, action] of fetchStream(
      http,
      endpoint,
      apiVersion,
      abortCtrl,
      body,
      true,
      headers
    )) {
      if (fetchStreamError !== null) {
        actionBuffer.push(addError(fetchStreamError));
      } else if (action) {
        actionBuffer.push(action);
      }
    }

    fetchState.isActive = false;
    flushBuffer(false);
  },
  {
    condition: (_, { getState }) => {
      // This is a bit of a hack to prevent instant restarts while the stream is running.
      // The problem is that in RTK v1, async thunks cannot be made part of the slice,
      // so they will not know the namespace used where they run in. We just assume
      // `stream` here as the namespace, if it's a custom one, this will not work.
      // RTK v2 will allow async thunks to be part of the slice, a draft PR to upgrade
      // is up there: https://github.com/elastic/kibana/pull/178986
      try {
        const s = getState() as { stream?: StreamState };

        if (s.stream === undefined) {
          return true;
        }

        // If the stream was running, the extra reducers will also have set
        // and error, so we need to prevent the stream from starting again.
        if (s.stream.isRunning && s.stream.errors.length > 0) {
          return false;
        }
      } catch (e) {
        return true;
      }
    },
  }
);

export interface StreamState {
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
  },
  extraReducers: (builder) => {
    builder.addCase(startStream.pending, (state) => {
      if (state.isRunning) {
        state.errors.push('Instant restart while running not supported yet.');
        return;
      }

      state.errors = [];
      state.isCancelled = false;
      state.isRunning = true;
    });
    builder.addCase(startStream.fulfilled, (state) => {
      state.isRunning = false;
    });
  },
});

// Action creators are generated for each case reducer function
export const { addError, cancelStream } = streamSlice.actions;
