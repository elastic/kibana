/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum VALIDATION_STATUS {
  ERROR = 'error',
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
}

export const SKIP_BUCKET_SPAN_ESTIMATION = true;

export const ALLOWED_DATA_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export const JOB_ID_MAX_LENGTH = 64;

/**
 * Job ID must contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores.
 * It must also start and end with an alphanumeric character.
 */
export const JOB_ID_PATTERN = /^([a-z0-9]+[a-z0-9\-_]*(?<![\-_]))?$/;
