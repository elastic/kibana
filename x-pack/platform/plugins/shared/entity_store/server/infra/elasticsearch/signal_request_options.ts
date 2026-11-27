/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type SignalRequestOptionsArgs = [] | [{ signal: AbortSignal }];

/**
 * Spread as the trailing arguments of an Elasticsearch client call so the request is
 * cancellable when a signal is given, and the call is made exactly as before otherwise.
 */
export const signalRequestOptions = (signal?: AbortSignal): SignalRequestOptionsArgs =>
  signal ? [{ signal }] : [];
