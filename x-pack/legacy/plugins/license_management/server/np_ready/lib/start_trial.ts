/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'src/core/server';
import { ElasticsearchPlugin } from '../../../../../../../src/legacy/core_plugins/elasticsearch';

export async function canStartTrial(
  req: KibanaRequest<any, any, any>,
  elasticsearch: ElasticsearchPlugin
) {
  const { callWithRequest } = elasticsearch.getCluster('admin');
  const options = {
    method: 'GET',
    path: '/_license/trial_status',
  };
  try {
    const response = await callWithRequest(req as any, 'transport.request', options);
    return response.eligible_to_start_trial;
  } catch (error) {
    return error.body;
  }
}

export async function startTrial(
  req: KibanaRequest<any, any, any>,
  elasticsearch: ElasticsearchPlugin,
  xpackInfo: any
) {
  const { callWithRequest } = elasticsearch.getCluster('admin');
  const options = {
    method: 'POST',
    path: '/_license/start_trial?acknowledge=true',
  };
  try {
    const response = await callWithRequest(req as any, 'transport.request', options);
    const { trial_was_started: trialWasStarted } = response;
    if (trialWasStarted) {
      await xpackInfo.refreshNow();
    }
    return response;
  } catch (error) {
    return error.body;
  }
}
