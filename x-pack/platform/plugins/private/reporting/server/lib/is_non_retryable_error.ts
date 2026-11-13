/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BrowserUnexpectedlyClosedError, PdfWorkerOutOfMemoryError } from '@kbn/reporting-common';
import { mapToReportingError } from '../../common/errors/map_to_reporting_error';

/** True when the browser or the PDF worker died, which the same report would likely cause again. */
export const isNonRetryableError = (error: unknown): boolean => {
  const reportingError = mapToReportingError(error);
  return (
    reportingError instanceof BrowserUnexpectedlyClosedError ||
    reportingError instanceof PdfWorkerOutOfMemoryError
  );
};
