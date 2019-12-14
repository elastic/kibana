/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export async function canStartTrial(req) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const options = {
    method: 'GET',
    path: '/_license/trial_status',
  };
  try {
    const response = await callWithRequest(req, 'transport.request', options);
    const { eligible_to_start_trial } = response;
    return eligible_to_start_trial;
  } catch (error) {
    return error.body;
  }
}
export async function startTrial(req, xpackInfo) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const options = {
    method: 'POST',
    path: '/_license/start_trial?acknowledge=true',
  };
  try {
    /*eslint camelcase: 0*/
    const response = await callWithRequest(req, 'transport.request', options);
    const { trial_was_started } = response;
    if (trial_was_started) {
      await xpackInfo.refreshNow();
    }
    return response;
  } catch (error) {
    return error.body;
  }
}
