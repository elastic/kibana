/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CanonicalAcl } from '@kbn/access-control';

import {
  ACCESS_CONTROL_ROUTE_SECURITY,
  createAccessControlHandler,
  objectParamsSchema,
} from './common';
import type { RouteDefinitionParams } from '..';

/**
 * Returns what the caller can do with an object. Only access managers receive the ACL itself and
 * the profiles of the users it names.
 */
export function defineGetAccessRoute(params: RouteDefinitionParams) {
  params.router.get(
    {
      path: '/internal/security/access_control/{type}/{id}',
      validate: { params: objectParamsSchema },
      security: ACCESS_CONTROL_ROUTE_SECURITY,
      options: { access: 'internal' },
    },
    createAccessControlHandler(
      params,
      async ({ context, request, response, aclService, spaceId }) => {
        const { type, id } = request.params;

        // The Saved Objects client authorizes the read with the caller's feature privileges and masks
        // an object the caller cannot view as missing.
        const { savedObjects } = await context.core;
        const object = await savedObjects.getClient({ includedHiddenTypes: [type] }).get(type, id);

        const decision = await aclService.evaluate({ type, spaceId, acl: object.acl });
        const principal = await aclService.getPrincipal();
        const canManage = decision.operations.has('manage_access');

        return response.ok({
          body: {
            type,
            id,
            version: object.version,
            state: decision.state,
            restricted: decision.restricted,
            is_owner: decision.isOwner,
            permissions: [...decision.operations],
            via_recovery: [...decision.viaRecovery],
            can_claim:
              decision.state === 'absent' && decision.operations.has('edit') && !!principal,
            current_principal: principal ?? null,
            ...(canManage &&
              object.acl && {
                acl: object.acl,
                profiles: await getProfiles(params, object.acl),
              }),
          },
        });
      }
    )
  );
}

/**
 * Returns the profiles of the owner and the users the ACL names. Profiles that no longer exist are
 * left out, and the UI shows the raw ID instead.
 */
const getProfiles = async (
  { getUserProfileService }: RouteDefinitionParams,
  { owner, entries }: CanonicalAcl
) => {
  const uids = new Set(
    [
      ...(owner.type.includes('user') ? owner.id : []),
      ...entries.filter(({ type }) => type.includes('user')).flatMap(({ id }) => id),
    ].filter(Boolean)
  );
  return uids.size > 0 ? await getUserProfileService().bulkGet({ uids, dataPath: 'avatar' }) : [];
};
