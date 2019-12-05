/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallESAsCurrentUser } from '../../../../server/lib/cluster_access';
import { getPolicy } from './ilm';

export async function installILMPolicy(name: string, callCluster: CallESAsCurrentUser) {
  // TODO: This should be in the end loaded from the base package instead of being hardcoded
  const policy = getPolicy();

  const data = await callCluster('transport.request', {
    method: 'PUT',
    path: '/_ilm/policy/' + name,
    body: policy,
  });
  // TODO: Check if policy was created as expected

  return data;
}

export async function policyExists(
  name: string,
  callCluster: CallESAsCurrentUser
): Promise<boolean> {
  try {
    // TODO: Figure out if there is a better way to check for an ILM policy to exist that
    // does not throw an exception.
    await callCluster('transport.request', {
      method: 'GET',
      path: '/_ilm/policy/' + name,
    });
    return true;
  } catch (e) {
    return false;
  }

  return false;
}
