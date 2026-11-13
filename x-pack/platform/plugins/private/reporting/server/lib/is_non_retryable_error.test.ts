/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BrowserScreenshotError,
  BrowserUnexpectedlyClosedError,
  KibanaShuttingDownError,
  PdfWorkerOutOfMemoryError,
  QueueTimeoutError,
} from '@kbn/reporting-common';
import { errors } from '@kbn/screenshotting-plugin/common';
import { isNonRetryableError } from './is_non_retryable_error';

describe('isNonRetryableError', () => {
  it.each([
    ['a closed browser reporting error', new BrowserUnexpectedlyClosedError()],
    ['a closed browser screenshotting error', new errors.BrowserClosedUnexpectedly()],
    ['a PDF worker out of memory reporting error', new PdfWorkerOutOfMemoryError()],
    ['a PDF worker out of memory screenshotting error', new errors.PdfWorkerOutOfMemoryError()],
  ])('is true for %s', (_name, error) => {
    expect(isNonRetryableError(error)).toBe(true);
  });

  it('is true for a closed browser error that crossed a module boundary', () => {
    const error = new Error('Browser was closed unexpectedly!');
    error.name = 'BrowserClosedUnexpectedly';

    expect(isNonRetryableError(error)).toBe(true);
  });

  it.each([
    ['a generic error', new Error('failure generating report')],
    ['a failed screenshot capture', new errors.FailedToCaptureScreenshot()],
    ['a browser screenshot error', new BrowserScreenshotError()],
    ['a queue timeout', new QueueTimeoutError()],
    ['Kibana shutting down', new KibanaShuttingDownError()],
    ['a non-error value', 'failure generating report'],
  ])('is false for %s', (_name, error) => {
    expect(isNonRetryableError(error)).toBe(false);
  });
});
