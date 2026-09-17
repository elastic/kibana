/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, KibanaRequest } from '@kbn/core/server';
import type { AccessControlInput } from '@kbn/entity-access-control';
import { InvalidAccessControlError } from '@kbn/entity-access-control';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { ILicenseState } from '../../../lib';
import type { ActionsPluginsStart } from '../../../plugin';
import type { ActionsRequestHandlerContext } from '../../../types';
import type {
  ConnectorAccessControlApiResponse,
  ConnectorAccessRole,
} from '../../../../common/access_control';
import { connectorAccessControlSchema } from '../../../../common/access_control';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../../common';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';
import { errorHandler } from '../error_handler';

const paramsSchema = schema.object({ id: schema.string({ minLength: 1, maxLength: 1024 }) });

const bodySchema = schema.object({
  access_mode: schema.oneOf([schema.literal('private'), schema.literal('public')]),
  entries: schema.maybe(
    schema.arrayOf(
      schema.object({
        type: schema.literal('user'),
        id: schema.string({ minLength: 1, maxLength: 1024 }),
        role: schema.literal('executor'),
      }),
      { maxSize: 100 }
    )
  ),
});

export const connectorAccessControlRoutes = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  core: CoreSetup<ActionsPluginsStart>
) => {
  const path = `${INTERNAL_BASE_ACTION_API_PATH}/connector/{id}/access_control`;

  /**
   * Only users that can already view and run connectors in the space may be granted access:
   * an access control entry subtracts access, it never grants a missing privilege.
   */
  const getRecipientPrivileges = (security: SecurityPluginStart | undefined) =>
    security
      ? [
          security.authz.actions.savedObject.get('action', 'get'),
          security.authz.actions.savedObject.get('action_task_params', 'create'),
        ]
      : [];

  const getSpaceId = async (request: KibanaRequest) => {
    const [, { spaces }] = await core.getStartServices();
    return spaces?.spacesService.getSpaceId(request) ?? 'default';
  };

  router.get(
    {
      path,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: { params: paramsSchema },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async (context, request, response) => {
        try {
          const actionsClient = (await context.actions).getActionsClient();
          const accessControl = await actionsClient.getAccessControl(request.params.id);
          const [, { security }] = await core.getStartServices();

          const uids = new Set(
            [
              accessControl.owner,
              ...(accessControl.access_control?.entries ?? []).map(({ id }) => id),
            ].filter((uid): uid is string => !!uid)
          );
          const currentUserProfileId = (await security?.userProfiles.getCurrent({ request }))?.uid;

          const body: ConnectorAccessControlApiResponse = {
            ...accessControl,
            profiles: uids.size
              ? (await security?.userProfiles.bulkGet({ uids, dataPath: 'avatar' })) ?? []
              : [],
            ...(currentUserProfileId && { current_user_profile_id: currentUserProfileId }),
          };

          return response.ok({ body });
        } catch (error) {
          return errorHandler(response, error);
        }
      })
    )
  );

  router.put(
    {
      path,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: { params: paramsSchema, body: bodySchema },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async (context, request, response) => {
        try {
          const actionsClient = (await context.actions).getActionsClient();
          const [, { security }] = await core.getStartServices();
          const input = connectorAccessControlSchema.parse(
            request.body
          ) as AccessControlInput<ConnectorAccessRole>;

          await actionsClient.updateAccessControl(request.params.id, input, async (profileIds) => {
            const profiles = await security?.userProfiles.bulkGet({ uids: profileIds });
            const found = new Set((profiles ?? []).map(({ uid }) => uid));
            if ([...profileIds].some((uid) => !found.has(uid))) {
              throw Boom.badRequest('One or more of the selected users could not be resolved');
            }
          });

          return response.noContent();
        } catch (error) {
          return errorHandler(
            response,
            error instanceof InvalidAccessControlError ? Boom.badRequest(error.message) : error
          );
        }
      })
    )
  );

  router.post(
    {
      path: `${path}/_suggest_user_profiles`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: paramsSchema,
        body: schema.object({
          name: schema.string({ maxLength: 1024 }),
          size: schema.number({ min: 1, max: 100, defaultValue: 20 }),
        }),
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async (context, request, response) => {
        try {
          const actionsClient = (await context.actions).getActionsClient();
          const { permissions } = await actionsClient.getAccessControl(request.params.id);
          if (!permissions.manage) {
            throw Boom.forbidden('Only the owner can manage the access of a connector');
          }

          const [, { security }] = await core.getStartServices();
          if (!security) {
            return response.ok({ body: [] });
          }

          const profiles = await security.userProfiles.suggest({
            name: request.body.name,
            size: request.body.size,
            dataPath: 'avatar',
            requiredPrivileges: {
              spaceId: await getSpaceId(request),
              privileges: { kibana: getRecipientPrivileges(security) },
            },
          });

          return response.ok({ body: profiles });
        } catch (error) {
          return errorHandler(response, error);
        }
      })
    )
  );
};
