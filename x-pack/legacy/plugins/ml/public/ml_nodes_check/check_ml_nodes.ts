/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ml } from '../services/ml_api_service';

let mlNodeCount: number = 0;
let userHasPermissionToViewMlNodeCount: boolean = false;

export async function checkMlNodesAvailable() {
  try {
    const nodes = await getMlNodeCount();
    if (nodes.count !== undefined && nodes.count > 0) {
      Promise.resolve();
    } else {
      throw Error('Cannot load count of ML nodes');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    window.location.href = '#/jobs';
    Promise.reject();
  }
}

export async function getMlNodeCount() {
  try {
    const nodes = await ml.mlNodeCount();
    mlNodeCount = nodes.count;
    userHasPermissionToViewMlNodeCount = true;
    return Promise.resolve(nodes);
  } catch (error) {
    mlNodeCount = 0;
    if (error.statusCode === 403) {
      userHasPermissionToViewMlNodeCount = false;
    }
    return Promise.resolve({ count: 0 });
  }
}

export function mlNodesAvailable() {
  return mlNodeCount !== 0;
}

export function permissionToViewMlNodeCount() {
  return userHasPermissionToViewMlNodeCount;
}
