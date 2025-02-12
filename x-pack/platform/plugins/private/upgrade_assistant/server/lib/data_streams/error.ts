/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AccessForbidden,
  IndexNotFound,
  ReindexTaskFailed,
  ReindexAlreadyInProgress,
  ReindexCannotBeCancelled,
  MetadataCannotBeGrabbed,
} from './error_symbols';

export class ReindexError extends Error {
  constructor(message: string, public readonly symbol: symbol) {
    super(message);
  }
}

export const createErrorFactory = (symbol: symbol) => (message: string) => {
  return new ReindexError(message, symbol);
};

export const error = {
  indexNotFound: createErrorFactory(IndexNotFound),
  accessForbidden: createErrorFactory(AccessForbidden),
  cannotGrabMetadata: createErrorFactory(MetadataCannotBeGrabbed),
  reindexTaskFailed: createErrorFactory(ReindexTaskFailed),
  reindexAlreadyInProgress: createErrorFactory(ReindexAlreadyInProgress),
  reindexCannotBeCancelled: createErrorFactory(ReindexCannotBeCancelled),
};
