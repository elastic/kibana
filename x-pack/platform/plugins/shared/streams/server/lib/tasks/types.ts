/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type PersistedTask<TPayload extends {} = {}> =
  | {
      id: string;
      status: 'not_started' | 'in_progress';
    }
  | {
      id: string;
      status: 'completed';
      payload: TPayload;
    }
  | {
      id: string;
      status: 'failed';
      error: string;
    };
