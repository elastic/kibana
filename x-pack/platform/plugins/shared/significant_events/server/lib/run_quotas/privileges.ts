/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import type { SignificantEventsServer } from '../../types';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';

export const canManageRunQuotas = async ({
  request,
  server,
}: {
  request: KibanaRequest;
  server: SignificantEventsServer;
}): Promise<boolean> => {
  const authz = server.security.authz;
  if (!authz) {
    return false;
  }

  const result = await authz.checkPrivilegesWithRequest(request).globally({
    kibana: [authz.actions.api.get(STREAMS_API_PRIVILEGES.manage)],
  });
  return result.hasAllRequested;
};

export const assertCanManageRunQuotas = async ({
  request,
  server,
}: {
  request: KibanaRequest;
  server: SignificantEventsServer;
}): Promise<void> => {
  if (!(await canManageRunQuotas({ request, server }))) {
    throw Boom.forbidden('Managing run limits requires Streams manage in all spaces');
  }
};
