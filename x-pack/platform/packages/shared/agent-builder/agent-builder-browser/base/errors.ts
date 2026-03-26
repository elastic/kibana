/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inspect } from 'util';

/*
 * Produce a string version of an error,
 */
export function formatAgentBuilderErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (!error) {
    // stringify undefined/null/whatever this falsy value is
    return inspect(error);
  }

  // handle http response errors with error messages
  if (error.body && typeof error.body.message === 'string') {
    return error.body.message;
  }

  // handle standard error objects with messages
  if (error instanceof Error && error.message) {
    return error.message;
  }

  // everything else can just be serialized using util.inspect()
  return inspect(error);
}
