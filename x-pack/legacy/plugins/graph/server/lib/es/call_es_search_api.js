/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

export async function callEsSearchApi({ callCluster, index, body, queryParams }) {
  try {
    return {
      ok: true,
      resp: await callCluster('search', {
        ...queryParams,
        index,
        body,
      }),
    };
  } catch (error) {
    throw Boom.boomify(error, { statusCode: error.statusCode || 500 });
  }
}
