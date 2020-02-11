/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Setup } from '../helpers/setup_request';

export async function getIndicesPrivileges(setup: Setup) {
  const { client, indices } = setup;
  const response = await client.indicesPrivileges(indices);
  return response.index;
}
