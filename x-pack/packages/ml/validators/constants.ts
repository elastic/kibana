/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Interface for a callout message.
 */
export interface CalloutMessage {
  /**
   * Unique identifier for the callout message.
   */
  id: string;
  /**
   * Heading of the callout message.
   */
  heading: string;
  /**
   * Status of the callout message.
   */
  status: VALIDATION_STATUS;
  /**
   * Text of the callout message.
   */
  text: string;
  /**
   * Optional URL for the callout message.
   */
  url?: string;
}

/**
 * Type for the response of the validate analytics job API.
 */
export type ValidateAnalyticsJobResponse = CalloutMessage[];

/**
 * Enum for the validation status.
 */
export enum VALIDATION_STATUS {
  ERROR = 'error',
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
}

/**
 * Boolean const for skipping the bucket span estimation.
 */
export const SKIP_BUCKET_SPAN_ESTIMATION = true;

/**
 * Const for allowed data units.
 */
export const ALLOWED_DATA_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * Const for the maximum length of a job ID.
 */
export const JOB_ID_MAX_LENGTH = 64;

// Data Frame Analytics

/**
 * Const for the upper limit of training documents.
 */
export const TRAINING_DOCS_UPPER = 200000;

/**
 * Const for the lower limit of training documents.
 */
export const TRAINING_DOCS_LOWER = 200;

/**
 * Const for the threshold of included fields.
 */
export const INCLUDED_FIELDS_THRESHOLD = 100;

/**
 * Const for the minimum number of fields for check.
 */
export const MINIMUM_NUM_FIELD_FOR_CHECK = 25;

/**
 * Const for the fraction empty limit.
 */
export const FRACTION_EMPTY_LIMIT = 0.3;

/**
 * Const for the maximum length of categories.
 */
export const NUM_CATEGORIES_THRESHOLD = 10;

/**
 * Const for all categories.
 */
export const ALL_CATEGORIES = -1;
