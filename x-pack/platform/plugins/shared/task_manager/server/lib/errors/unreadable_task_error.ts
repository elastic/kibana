/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectError } from '@kbn/core-saved-objects-common';

/**
 * The error for a task whose stored document can't be parsed. Unlike a transient read failure, it
 * fails the same way on every read.
 */
export const getUnreadableTaskError = (message: string): SavedObjectError => ({
  error: 'Internal Server Error',
  message,
  statusCode: 500,
  metadata: { isUnreadableTask: true },
});

export const isUnreadableTaskError = (error: SavedObjectError): boolean =>
  error.metadata?.isUnreadableTask === true;
