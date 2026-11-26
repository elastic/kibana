/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REMOVED_STREAM_TYPE_NOT_FOUND_REASON } from '../../../../common/constants';
import { DefinitionNotFoundError } from './definition_not_found_error';

/**
 * A 404 for a stream whose type (query or draft) has been removed, so clients can tell it apart
 * from a stream that never existed.
 */
export class RemovedStreamTypeError extends DefinitionNotFoundError {
  constructor(message: string) {
    super(message);
    this.name = 'RemovedStreamTypeError';
    this.data = { reason: REMOVED_STREAM_TYPE_NOT_FOUND_REASON };
  }
}
