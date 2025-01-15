/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { DataUsageError } from './common/errors';

export class NotFoundError extends DataUsageError {}

export class AutoOpsError extends DataUsageError {}

export class NoPrivilegeMeteringError extends DataUsageError {
  constructor() {
    super(
      'You do not have the necessary privileges to access data stream statistics. Please contact your administrator.'
    );
  }
}

export class NoIndicesMeteringError extends DataUsageError {
  constructor() {
    super(
      'No data streams or indices are available for the current user. Ensure that the data streams or indices you are authorized to access have been created and contain data. If you believe this is an error, please contact your administrator.'
    );
  }
}
