/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isPlainObject } from 'lodash';

export const casesSchemaValidator = (data: unknown) => {
  if (!isPlainObject(data) || data === null) {
    throw new Error('Persistable attachment data must be an object');
  }

  const state = (data as Record<string, unknown>).state;
  if (!isPlainObject(state) || state === null) {
    throw new Error('Persistable attachment data must include object "state"');
  }
};
