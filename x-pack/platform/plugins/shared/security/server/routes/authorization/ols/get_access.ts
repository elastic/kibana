/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generalAccessPermits, type Principal, readEditableAcl, type StoredAcl } from '@kbn/ols';

import { createOlsHandler, objectParamsSchema, OLS_ROUTE_SECURITY } from './common';
import type { RouteDefinitionParams } from '../..';

/**
 * Returns what the caller can do with an object and who owns it. Everyone who can view the object
 * sees its owner, so they know whom to ask for access. Only access managers receive the ACL itself
 * and the profiles of every user it names.
 */
export function defineGetAccessRoute(params: RouteDefinitionParams) {
  params.router.get(
    {
      path: '/internal/security/ols/{type}/{id}',
      validate: { params: objectParamsSchema },
      security: OLS_ROUTE_SECURITY,
      options: { access: 'internal' },
    },
    createOlsHandler(
      params,
      async ({ context, request, response, olsService, policy, spaceId }) => {
        const { type, id } = request.params;

        // The Saved Objects client authorizes the read with the caller's feature privileges and masks
        // an object the caller cannot view as missing.
        const { savedObjects } = await context.core;
        const object = await savedObjects.getClient({ includedHiddenTypes: [type] }).get(type, id);

        const decision = await olsService.getPermissions({ type, spaceId, acl: object.acl });
        const principal = await olsService.getPrincipal();
        const canManage = decision.operations.has('manage_access');
        // Left out when the stored owner doesn't name exactly one principal.
        const owner = object.acl ? readEditableAcl(policy, object.acl).owner : undefined;

        return response.ok({
          body: {
            type,
            id,
            version: object.version,
            state: decision.state,
            restricted: decision.restricted,
            // Whether general access alone lets everyone in the space view the object. Unlike
            // `restricted`, an entry that only adds access doesn't change it.
            everyone_can_view: generalAccessPermits(policy, object.acl, 'view'),
            is_owner: decision.isOwner,
            permissions: [...decision.operations],
            permissions_via_recovery: [...decision.operationsViaRecovery],
            can_claim:
              decision.state === 'absent' && decision.operations.has('edit') && !!principal,
            current_principal: principal ?? null,
            owner: owner ?? null,
            ...(canManage && object.acl
              ? { acl: object.acl, profiles: await getAclProfiles(params, object.acl) }
              : { profiles: await getOwnerProfiles(params, owner) }),
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
const getAclProfiles = (params: RouteDefinitionParams, { owner, entries }: StoredAcl) =>
  getProfiles(params, [
    ...(owner.type.includes('user') ? owner.id : []),
    ...entries.filter(({ type }) => type.includes('user')).flatMap(({ id }) => id),
  ]);

/**
 * Returns the owner's profile, when the owner is a user whose profile exists.
 */
const getOwnerProfiles = (params: RouteDefinitionParams, owner: Principal | undefined) =>
  getProfiles(params, owner?.type === 'user' ? [owner.id] : []);

const getProfiles = async ({ getUserProfileService }: RouteDefinitionParams, ids: string[]) => {
  const uids = new Set(ids.filter(Boolean));
  return uids.size > 0 ? await getUserProfileService().bulkGet({ uids, dataPath: 'avatar' }) : [];
};
