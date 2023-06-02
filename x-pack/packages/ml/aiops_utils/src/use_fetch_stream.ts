/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  Dispatch,
  Reducer,
  ReducerAction,
  ReducerState,
} from 'react';

import { fetchStream } from './fetch_stream';
import { stringReducer, StringReducer } from './string_reducer';

/**
 * Custom hook type definition of the base params for an NDJSON stream with custom reducer.
 *
 * @export
 * @interface UseFetchStreamCustomReducerParams
 * @typedef {UseFetchStreamCustomReducerParams}
 */
export interface UseFetchStreamCustomReducerParams {
  /**
   * API endpoint
   * @type {string}
   */
  endpoint: string;
  /**
   * API version
   * @type {string}
   */
  apiVersion: string;
  /**
   * Request body
   * @type {object}
   */
  body: object;
  /**
   * Reducer function to be applied to response chunks.
   * @type {Reducer<any, any>}
   */
  reducer: Reducer<any, any>;
}

/**
 * Custom hook type definition of the base params for a string base stream without a custom reducer.
 */
export interface UseFetchStreamParamsDefault {
  /**
   * API endpoint
   * @type {string}
   */
  endpoint: string;
  /**
   * API version
   * @type {string}
   */
  apiVersion: string;
  /**
   * Request body
   * @type {object}
   */
  body: object;
  /**
   * Reducer function to be applied to response chunks.
   * @type {StringReducer}
   */
  reducer: StringReducer;
}

/**
 * The return type of the `useFetchStream` hook.
 *
 * @interface UseFetchStreamReturnType
 * @typedef {UseFetchStreamReturnType}
 * @template Data
 * @template Action
 */
interface UseFetchStreamReturnType<Data, Action> {
  cancel: () => void;
  data: Data;
  dispatch: Dispatch<Action>;
  errors: string[];
  isCancelled: boolean;
  isRunning: boolean;
  start: () => Promise<void>;
}

/**
 * This overload allows us to fall back to a simple reducer that
 * just acts on a string as the reducer state if no options are supplied.
 *
 * @export
 * @template I
 * @template BasePath
 * @param {`${I['endpoint']}`} endpoint - API endpoint including Kibana base path.
 * @param {I['apiVersion']} apiVersion - API version.
 * @param {I['body']} body - API request body.
 * @returns {UseFetchStreamReturnType<string, ReducerAction<I['reducer']>>} - An object with streaming data and methods to act on the stream.
 */
export function useFetchStream<I extends UseFetchStreamParamsDefault, BasePath extends string>(
  endpoint: `${BasePath}${I['endpoint']}`,
  apiVersion: I['apiVersion'],
  body: I['body']
): UseFetchStreamReturnType<string, ReducerAction<I['reducer']>>;

/**
 * This overload covers passing in options and will use
 * a custom reducer with appropriate type support.
 *
 * @export
 * @template I
 * @template BasePath
 * @param {`${I['endpoint']}`} endpoint - API endpoint including Kibana base path.
 * @param {I['apiVersion']} apiVersion - API version.
 * @param {I['body']} body - API request body.
 * @param {{ reducer: I['reducer']; initialState: ReducerState<I['reducer']> }} options - Custom reducer and initial state.
 * @returns {UseFetchStreamReturnType<ReducerState<I['reducer']>, ReducerAction<I['reducer']>>} - An object with streaming data and methods to act on the stream.
 */
export function useFetchStream<
  I extends UseFetchStreamCustomReducerParams,
  BasePath extends string
>(
  endpoint: `${BasePath}${I['endpoint']}`,
  apiVersion: I['apiVersion'],
  body: I['body'],
  options: {
    /**
     * Custom reducer
     * @type {I['reducer']}
     */
    reducer: I['reducer'];
    /**
     * Initial state
     * @type {ReducerState<I['reducer']>}
     */
    initialState: ReducerState<I['reducer']>;
  }
): UseFetchStreamReturnType<ReducerState<I['reducer']>, ReducerAction<I['reducer']>>;

/**
 * Custom hook to receive streaming data.
 *
 * @param endpoint - API endpoint including Kibana base path.
 * @param apiVersion - API version.
 * @param body - API request body.
 * @param options - Optional custom reducer and initial state.
 * @returns An object with streaming data and methods to act on the stream.
 */
export function useFetchStream<I extends UseFetchStreamParamsDefault, BasePath extends string>(
  endpoint: `${BasePath}${I['endpoint']}`,
  apiVersion: string,
  body: I['body'],
  options?: {
    /**
     * Custom reducer
     * @type {I['reducer']}
     */
    reducer: I['reducer'];
    /**
     * Initial state
     * @type {ReducerState<I['reducer']>}
     */
    initialState: ReducerState<I['reducer']>;
  }
): UseFetchStreamReturnType<ReducerState<I['reducer']>, ReducerAction<I['reducer']>> {
  const [errors, setErrors] = useState<string[]>([]);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const reducer = (options?.reducer ?? stringReducer) as I['reducer'];
  const initialState = (options?.initialState ?? '') as ReducerState<I['reducer']>;

  const [data, dispatch] = useReducer(reducer, initialState);

  const abortCtrl = useRef(new AbortController());

  const addError = (error: string) => {
    setErrors((prevErrors) => [...prevErrors, error]);
  };

  const start = async () => {
    if (isRunning) {
      addError('Restart not supported yet.');
      return;
    }

    setErrors([]);
    setIsRunning(true);
    setIsCancelled(false);

    abortCtrl.current = new AbortController();

    for await (const [fetchStreamError, actions] of fetchStream<
      UseFetchStreamCustomReducerParams,
      BasePath
    >(endpoint, apiVersion, abortCtrl, body, options !== undefined)) {
      if (fetchStreamError !== null) {
        addError(fetchStreamError);
      } else if (actions.length > 0) {
        dispatch(actions as ReducerAction<I['reducer']>);
      }
    }

    setIsRunning(false);
  };

  const cancel = () => {
    abortCtrl.current.abort();
    setIsCancelled(true);
    setIsRunning(false);
  };

  // If components using this custom hook get unmounted, cancel any ongoing request.
  useEffect(() => {
    return () => abortCtrl.current.abort();
  }, []);

  return {
    cancel,
    data,
    dispatch,
    errors,
    isCancelled,
    isRunning,
    start,
  };
}
