/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface StreamState {
  isRunning: boolean;
  groupingEnabled: boolean;
  loaded: number;
  sampleProbability: number;
  shouldStop: boolean;
}

const getDefaultStreamState = (overrides: Partial<StreamState>): StreamState => ({
  isRunning: !!overrides.isRunning,
  groupingEnabled: !!overrides.groupingEnabled,
  loaded: overrides.loaded ?? 0,
  sampleProbability: overrides.sampleProbability ?? 1,
  shouldStop: !!overrides.shouldStop,
});

/**
 * `stateHandlerFactory` takes care of handling the inner state of the stream,
 * for example how much of the stream has been completed, if the stream is running etc.
 * It exposes the state as getter/setter functions, for example `loaded()` will
 * retrieve the current loading state, `loaded(0.5)` will update it.
 */
export const stateHandlerFactory = (overrides: Partial<StreamState>) => {
  const state = getDefaultStreamState(overrides);

  function groupingEnabled(d?: boolean) {
    if (typeof d === 'boolean') {
      state.groupingEnabled = d;
    } else {
      return state.groupingEnabled;
    }
  }

  function loaded(): number;
  function loaded(d: number, replace?: boolean): undefined;
  function loaded(d?: number, replace = true) {
    if (typeof d === 'number') {
      if (replace) {
        state.loaded = Math.round(d * 100) / 100;
      } else {
        state.loaded += Math.round(d * 100) / 100;
      }
    } else {
      return state.loaded;
    }
  }

  function isRunning(d?: boolean) {
    if (typeof d === 'boolean') {
      state.isRunning = d;
    } else {
      return state.isRunning;
    }
  }

  function sampleProbability(d?: number) {
    if (typeof d === 'number') {
      state.sampleProbability = d;
    } else {
      return state.sampleProbability;
    }
  }

  function shouldStop(d?: boolean) {
    if (typeof d === 'boolean') {
      state.shouldStop = d;
    } else {
      return state.shouldStop;
    }
  }

  return { groupingEnabled, isRunning, loaded, sampleProbability, shouldStop };
};

export type StateHandler = ReturnType<typeof stateHandlerFactory>;
