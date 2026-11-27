/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import { STATUS_API_PATH, type BootstrapStatusResponse } from '../../common';
import type { InternalServices } from '../types';

/** Returns the hash of the files last applied and how that run went. */
export const registerStatusRoute = ({
  router,
  getServices,
}: {
  router: IRouter;
  getServices: () => InternalServices;
}): void => {
  router.get(
    {
      path: STATUS_API_PATH,
      security: {
        authz: {
          requiredPrivileges: [ReservedPrivilegesSet.superuser],
        },
      },
      validate: false,
      options: {
        access: 'internal',
      },
    },
    async (_context, _request, response) => {
      const latest = await getServices().status.get();
      if (!latest) {
        const none: BootstrapStatusResponse = { status: 'none', hash: null, kinds: {}, errors: [] };
        return response.ok({ body: none });
      }
      // The request numbers, settings hash and revision only decide runs inside Kibana, so they are not served.
      const { coveredRequestNumber, settingsHash, finishedRequestNumber, revision, ...body } =
        latest;
      return response.ok({ body: body satisfies BootstrapStatusResponse });
    }
  );
};
