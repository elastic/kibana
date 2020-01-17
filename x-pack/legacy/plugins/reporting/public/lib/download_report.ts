/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { API_BASE_URL } from '../../common/constants';

export function getReportURL(jobId: string) {
  const apiBaseUrl = chrome.addBasePath(API_BASE_URL);
  const downloadLink = `${apiBaseUrl}/jobs/download/${jobId}`;

  return downloadLink;
}

export function downloadReport(jobId: string) {
  const location = getReportURL(jobId);

  window.open(location);
}
