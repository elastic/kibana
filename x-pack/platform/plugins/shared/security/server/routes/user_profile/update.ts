/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import { IMAGE_FILE_TYPES } from '../../../common/constants';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { flattenObject } from '../../lib';
import { getPrintableSessionId } from '../../session_management';
import { createLicensedRouteHandler } from '../licensed_route_handler';

/** User profile data keys that are allowed to be updated by Cloud users */
const ALLOWED_KEYS_UPDATE_CLOUD = ['userSettings.darkMode'];

export function defineUpdateUserProfileDataRoute({
  router,
  getSession,
  getUserProfileService,
  logger,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/user_profile/_data',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the internal authorization service; an authenticated user and valid session are required',
        },
      },
      validate: {
        body: schema.recordOf(schema.string(), schema.any()),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const session = await getSession().get(request);
      if (session.error) {
        logger.warn('User profile requested without valid session.');
        return response.notFound();
      }

      if (!session.value.userProfileId) {
        logger.warn(
          `User profile missing from current session. (sid: ${getPrintableSessionId(
            session.value.sid
          )})`
        );
        return response.notFound();
      }

      const currentUser = getAuthenticationService().getCurrentUser(request);

      const userProfileData = request.body;
      const imageDataUrl = userProfileData.avatar?.imageUrl;
      if (imageDataUrl && typeof imageDataUrl === 'string') {
        const matches = imageDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return response.customError({
            body: 'Unsupported media type',
            statusCode: 415,
          });
        }

        const [, mimeType] = matches;

        if (!IMAGE_FILE_TYPES.includes(mimeType)) {
          return response.customError({
            body: 'Unsupported media type',
            statusCode: 415,
          });
        }
      }

      const keysToUpdate = Object.keys(flattenObject(userProfileData));

      if (currentUser?.elastic_cloud_user) {
        // We only allow specific user profile data to be updated by Elastic Cloud SSO users.
        const isUpdateAllowed = keysToUpdate.every((key) =>
          ALLOWED_KEYS_UPDATE_CLOUD.includes(key)
        );
        if (keysToUpdate.length === 0 || !isUpdateAllowed) {
          logger.warn(
            `Elastic Cloud SSO users aren't allowed to update profiles in Kibana. (sid: ${getPrintableSessionId(
              session.value.sid
            )})`
          );
          return response.forbidden();
        }
      }

      const userProfileService = getUserProfileService();
      try {
        await userProfileService.update(session.value.userProfileId, userProfileData);
        return response.ok();
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
