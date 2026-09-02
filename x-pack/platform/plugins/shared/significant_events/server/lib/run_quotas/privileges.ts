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

export const canManageSignificantEventsGlobally = async ({
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

export const canManageRunQuotas = canManageSignificantEventsGlobally;

export const canManageTokenTrackingGlobally = async ({
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
    kibana: [
      authz.actions.api.get(STREAMS_API_PRIVILEGES.manage),
      authz.actions.api.get('manage_advanced_settings'),
    ],
  });
  return result.hasAllRequested;
};

export const assertCanManageSignificantEventsGlobally = async ({
  request,
  server,
  message,
}: {
  request: KibanaRequest;
  server: SignificantEventsServer;
  message: string;
}): Promise<void> => {
  if (!(await canManageSignificantEventsGlobally({ request, server }))) {
    throw Boom.forbidden(message);
  }
};

export const assertCanManageTokenTrackingGlobally = async ({
  request,
  server,
}: {
  request: KibanaRequest;
  server: SignificantEventsServer;
}): Promise<void> => {
  if (!(await canManageTokenTrackingGlobally({ request, server }))) {
    throw Boom.forbidden(
      'Changing deployment-wide token tracking requires Streams and Advanced Settings management in all spaces'
    );
  }
};

export const assertCanManageRunQuotas = async ({
  request,
  server,
}: {
  request: KibanaRequest;
  server: SignificantEventsServer;
}): Promise<void> => {
  await assertCanManageSignificantEventsGlobally({
    request,
    server,
    message: 'Managing run limits requires Streams manage in all spaces',
  });
};
