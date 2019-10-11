/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO
// This code was largely borrowed from request.ts in es_ui_shared
// It was modified to use the http service from NP
// Once all apps utilizing request.ts have been migrated to NP,
// request.ts should be updated and this file will no longer be needed.

import { useEffect, useState, useRef } from 'react';

import { httpService } from './index';

export interface SendRequestResponse {
  data: any;
  error: Error | null;
}

export interface SendRequestOptions {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head';
  body?: any;
}

export interface UseRequestConfig {
  path: string;
  requestOptions: SendRequestOptions;
  pollIntervalMs?: number;
  initialData?: any;
  deserializer?: (data: any) => any;
}

export interface UseRequestResponse {
  isInitialRequest: boolean;
  isLoading: boolean;
  error: null | unknown;
  data: any;
  sendRequest: (...args: any[]) => Promise<SendRequestResponse>;
}

export const sendRequest = async (
  path: string,
  requestOptions: SendRequestOptions
): Promise<SendRequestResponse> => {
  try {
    const response = await httpService.httpClient.fetch(path, requestOptions);

    return { data: response, error: null };
  } catch (e) {
    return {
      data: null,
      error: e.response ? e.response : e,
    };
  }
};

export const useRequest = ({
  path,
  requestOptions,
  pollIntervalMs,
  initialData,
  deserializer = (data: any): any => data,
}: UseRequestConfig): UseRequestResponse => {
  // Main states for tracking request status and data
  const [error, setError] = useState<null | any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(initialData);

  // Consumers can use isInitialRequest to implement a polling UX.
  const [isInitialRequest, setIsInitialRequest] = useState<boolean>(true);
  const pollInterval = useRef<any>(null);
  const pollIntervalId = useRef<any>(null);

  // We always want to use the most recently-set interval in scheduleRequest.
  pollInterval.current = pollIntervalMs;

  // Tied to every render and bound to each request.
  let isOutdatedRequest = false;

  const scheduleRequest = () => {
    // Clear current interval
    if (pollIntervalId.current) {
      clearTimeout(pollIntervalId.current);
    }

    // Set new interval
    if (pollInterval.current) {
      pollIntervalId.current = setTimeout(_sendRequest, pollInterval.current);
    }
  };

  const _sendRequest = async () => {
    // We don't clear error or data, so it's up to the consumer to decide whether to display the
    // "old" error/data or loading state when a new request is in-flight.
    setIsLoading(true);

    const response = await sendRequest(path, requestOptions);
    const { data: serializedResponseData, error: responseError } = response;
    const responseData = deserializer(serializedResponseData);

    // If an outdated request has resolved, DON'T update state, but DO allow the processData handler
    // to execute side effects like update telemetry.
    if (isOutdatedRequest) {
      return { data: null, error: null };
    }

    setError(responseError);
    setData(responseData);
    setIsLoading(false);
    setIsInitialRequest(false);

    // If we're on an interval, we need to schedule the next request. This also allows us to reset
    // the interval if the user has manually requested the data, to avoid doubled-up requests.
    scheduleRequest();

    return { data: serializedResponseData, error: responseError };
  };

  useEffect(() => {
    _sendRequest();
    // To be functionally correct we'd send a new request if the method, path, or body changes.
    // But it doesn't seem likely that the method will change and body is likely to be a new
    // object even if its shape hasn't changed, so for now we're just watching the path.
  }, [path]);

  useEffect(() => {
    scheduleRequest();

    // Clean up intervals and inflight requests and corresponding state changes
    return () => {
      isOutdatedRequest = true;
      if (pollIntervalId.current) {
        clearTimeout(pollIntervalId.current);
      }
    };
  }, [pollIntervalMs]);

  return {
    isInitialRequest,
    isLoading,
    error,
    data,
    sendRequest: _sendRequest, // Gives the user the ability to manually request data
  };
};
