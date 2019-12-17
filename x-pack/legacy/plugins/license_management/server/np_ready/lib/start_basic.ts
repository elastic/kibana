/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { ElasticsearchPlugin } from '../../../../../../../src/legacy/core_plugins/elasticsearch';

const getStartBasicPath = (acknowledge: boolean) =>
  `/_license/start_basic${acknowledge ? '?acknowledge=true' : ''}`;

export async function startBasic(
  req: KibanaRequest<any, { acknowledge: string }, any>,
  elasticsearch: ElasticsearchPlugin,
  xpackInfo: any
) {
  const { acknowledge } = req.query;
  const { callWithRequest } = elasticsearch.getCluster('admin');
  const options = {
    method: 'POST',
    path: getStartBasicPath(Boolean(acknowledge)),
  };
  try {
    const response = await callWithRequest(req as any, 'transport.request', options);
    const { basic_was_started: basicWasStarted } = response;
    if (basicWasStarted) {
      await xpackInfo.refreshNow();
    }
    return response;
  } catch (error) {
    return error.body;
  }
}
