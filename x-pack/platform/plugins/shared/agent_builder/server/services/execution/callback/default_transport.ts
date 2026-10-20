/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CallbackTransportDefinition } from '@kbn/agent-builder-server';

/** Delivers to any callback URL with fetch, when no registered transport handles it. */
export const defaultTransport: CallbackTransportDefinition = {
  id: 'default',
  handles: () => true,
  send: (callbackUrl, payload, signal) =>
    fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'error',
      signal,
    }),
};
