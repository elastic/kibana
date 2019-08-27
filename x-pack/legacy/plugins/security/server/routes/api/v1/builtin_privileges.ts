/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { BuiltinESPrivileges } from '../../../../common/model';
import { getClient } from '../../../../../../server/lib/get_client_shield';

export function initGetBuiltinPrivilegesApi(server: Legacy.Server) {
  server.route({
    method: 'GET',
    path: '/api/security/v1/esPrivileges/builtin',
    async handler(req: Legacy.Request) {
      const callWithRequest = getClient(server).callWithRequest;
      const privileges = await callWithRequest<BuiltinESPrivileges>(
        req,
        'shield.getBuiltinPrivileges'
      );

      // Exclude the `none` privilege, as it doesn't make sense as an option within the Kibana UI
      privileges.cluster = privileges.cluster.filter(privilege => privilege !== 'none');
      privileges.index = privileges.index.filter(privilege => privilege !== 'none');

      return privileges;
    },
  });
}
