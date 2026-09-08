/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import { NIGHTSHIFT_ACTIVITY_MANAGE_PRIVILEGES } from '@kbn/nightshift-shared';
import type { SignificantEventsServer } from '../../types';

const forbiddenActivityManage = () =>
  Boom.forbidden(
    'Pausing or resuming Nightshift activity requires Context Engine or Detection Engine manage in all spaces'
  );

export const assertCanManageNightshiftActivityGlobally = async ({
  request,
  server,
}: {
  request: KibanaRequest;
  server: SignificantEventsServer;
}): Promise<void> => {
  const authz = server.security.authz;
  if (!authz) {
    throw forbiddenActivityManage();
  }

  const result = await authz.checkPrivilegesWithRequest(request).globally({
    kibana: NIGHTSHIFT_ACTIVITY_MANAGE_PRIVILEGES.map((privilege) =>
      authz.actions.api.get(privilege)
    ),
  });

  if (!result.privileges.kibana.some((privilege) => privilege.authorized)) {
    throw forbiddenActivityManage();
  }
};
