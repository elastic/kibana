/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set } from 'lodash/fp';

import { SetupPlugins } from '../../../../plugin';
import { KibanaRequest } from '../../../../../../../../../src/core/server';
import { RequestHandlerContext } from '../../../../../../../../../target/types/core/server';
import { FrameworkRequest } from '../../../framework';

export const buildFrameworkRequest = async (
  context: RequestHandlerContext,
  security: SetupPlugins['security'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: KibanaRequest
): FrameworkRequest => {
  const savedObjectsClient = context.core.savedObjects.client;
  const user = await security?.authc.getCurrentUser(request);
  let frameworkRequest = set('context.core.savedObjects.client', savedObjectsClient, request);
  frameworkRequest = set('user', user, frameworkRequest);
  return frameworkRequest;
};
