/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { CMBeat } from '../../../common/domain_types';
import { BaseReturnType, ReturnTypeUpdate } from '../../../common/return_types';
import { FrameworkRequest, internalUser } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

// TODO: write to Kibana audit log file (include who did the verification as well) https://github.com/elastic/kibana/issues/26024
export const createBeatUpdateRoute = (libs: CMServerLibs) => ({
  method: 'PUT',
  path: '/api/beats/agent/{beatId}',
  licenseRequired: REQUIRED_LICENSES,
  requiredRoles: ['beats_admin'],
  config: {
    validate: {
      headers: Joi.object({
        'kbn-beats-access-token': Joi.string(),
      }).options({
        allowUnknown: true,
      }),
      params: Joi.object({
        beatId: Joi.string(),
      }),
      payload: Joi.object({
        active: Joi.bool(),
        ephemeral_id: Joi.string(),
        host_name: Joi.string(),
        local_configuration_yml: Joi.string(),
        metadata: Joi.object(),
        name: Joi.string(),
        type: Joi.string(),
        version: Joi.string(),
      }),
    },
  },
  handler: async (
    request: FrameworkRequest
  ): Promise<BaseReturnType | ReturnTypeUpdate<CMBeat>> => {
    const { beatId } = request.params;
    const accessToken = request.headers['kbn-beats-access-token'];
    const remoteAddress = request.info.remoteAddress;
    const userOrToken = accessToken || request.user;

    if (request.user.kind === 'unauthenticated' && request.payload.active !== undefined) {
      return {
        error: {
          message: 'access-token is not a valid auth type to change beat status',
          code: 401,
        },
        success: false,
      };
    }

    const status = await libs.beats.update(userOrToken, beatId, {
      ...request.payload,
      host_ip: remoteAddress,
    });

    switch (status) {
      case 'beat-not-found':
        return {
          error: {
            message: 'Beat not found',
            code: 404,
          },
          success: false,
        };
      case 'invalid-access-token':
        return {
          error: {
            message: 'Invalid access token',
            code: 401,
          },
          success: false,
        };
    }

    const beat = await libs.beats.getById(internalUser, beatId);

    if (!beat) {
      return {
        error: {
          message: 'Beat not found',
          code: 404,
        },
        success: false,
      };
    }

    return {
      item: beat,
      action: 'updated',
      success: true,
    };
  },
});
