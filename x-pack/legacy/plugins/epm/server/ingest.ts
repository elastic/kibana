/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import fetch from 'node-fetch';
import { ReturnTypeCreate, ReturnTypeUpdate } from '../../ingest/common/types/std_return_format';
import { Datasource } from '../../ingest/common/types/domain_data';
import { Request } from './types';

// Temporary while we're iterating.
// Not an abstraction for Ingest. Just a file which handles Ingest-related behavior
// We'll delete it or clean it up eventually

export async function addDatasourcesToPolicy({
  request,
  datasources,
  policyId,
}: {
  request: Request;
  datasources: Array<Datasource['id']>;
  policyId: string;
}) {
  const result: ReturnTypeUpdate<Datasource> = await ingestAPI({
    method: 'post',
    path: `/api/ingest/policies/${policyId}/addDatasources`,
    body: { datasources },
    request,
  });

  if (result.success) {
    return result.item;
  } else {
    throw new Error(
      result.error?.message || `Error adding datasources ${datasources} to policy ${policyId}`
    );
  }
}

export async function createDatasource({
  request,
  datasource,
}: {
  request: Request;
  datasource: Omit<Datasource, 'id'>;
}) {
  const result: ReturnTypeCreate<Datasource> = await ingestAPI({
    path: '/api/ingest/datasources',
    method: 'post',
    body: { datasource },
    request,
  });

  if (result.success) {
    return result.item;
  } else {
    throw new Error(result.error?.message || `Error creating datasource ${datasource.name}}`);
  }
}

async function ingestAPI({
  path,
  method,
  body,
  request,
}: {
  path: string;
  method: string;
  body: Record<string, any>;
  request: Request;
}) {
  // node-fetch requires absolute urls because there isn't an origin on Node
  const origin = request.headers.origin || request.server.info.uri; // e.g. http://localhost:5601
  const basePath = request.getBasePath(); // e.g. /abc
  const url = `${origin}${basePath}${path}`;
  const bodyText = JSON.stringify(body);
  // prevent Ingest API from rejecting request as invalid or failing with 'Parse
  delete request.headers['transfer-encoding'];

  const result = await fetch(url, {
    method,
    body: bodyText,
    headers: {
      'kbn-xsrf': 'some value, any value',
      'Content-Type': 'application/json',
      // the main (only?) one we want is `authorization`
      ...request.headers,
    },
  }).then(r => r.json());

  return result;
}
