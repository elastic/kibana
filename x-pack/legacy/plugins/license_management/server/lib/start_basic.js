/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const getStartBasicPath = acknowledge =>
  `/_license/start_basic${acknowledge ? '?acknowledge=true' : ''}`;

export async function startBasic(req, xpackInfo) {
  const { acknowledge } = req.query;
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const options = {
    method: 'POST',
    path: getStartBasicPath(acknowledge),
  };
  try {
    const response = await callWithRequest(req, 'transport.request', options);
    /*eslint camelcase: 0*/
    const { basic_was_started } = response;
    if (basic_was_started) {
      await xpackInfo.refreshNow();
    }
    return response;
  } catch (error) {
    return error.body;
  }
}
