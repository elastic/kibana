/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Encodes an id and secret into the `base64(id:secret)` envelope API keys are stored in. */
export const encodeApiKey = (id: string, secret: string): string =>
  Buffer.from(`${id}:${secret}`).toString('base64');
