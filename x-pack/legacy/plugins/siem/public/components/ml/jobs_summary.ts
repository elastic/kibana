/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

const payload = { jobIds: [] };

// TODO: Finish this, call it, and use it or delete this
export const jobsSummary = async (jobIds = payload) => {
  const response = await fetch('/api/ml/jobs/jobs_summary', {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify(jobIds),
    headers: {
      'kbn-xsrf': chrome.getXsrfToken(),
    },
  });
  const json = await response.json();
  return json;
};
