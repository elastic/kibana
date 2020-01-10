/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'src/core/server';
import { ElasticsearchPlugin } from '../../../../../../../src/legacy/core_plugins/elasticsearch';
const getLicensePath = (acknowledge: boolean) =>
  `/_license${acknowledge ? '?acknowledge=true' : ''}`;

export async function putLicense(
  req: KibanaRequest<any, { acknowledge: string }, any>,
  elasticsearch: ElasticsearchPlugin,
  xpackInfo: any
) {
  const { acknowledge } = req.query;
  const { callWithRequest } = elasticsearch.getCluster('admin');
  const options = {
    method: 'POST',
    path: getLicensePath(Boolean(acknowledge)),
    body: req.body,
  };
  try {
    const response = await callWithRequest(req as any, 'transport.request', options);
    const { acknowledged, license_status: licenseStatus } = response;
    if (acknowledged && licenseStatus === 'valid') {
      await xpackInfo.refreshNow();
    }
    return response;
  } catch (error) {
    return error.body;
  }
}
