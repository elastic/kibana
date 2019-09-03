/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMBeat } from '../../../common/domain_types';
import { BaseReturnType, ReturnTypeGet } from '../../../common/return_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

export const createGetBeatRoute = (libs: CMServerLibs) => ({
  method: 'GET',
  path: '/api/beats/agent/{beatId}/{token?}',
  requiredRoles: ['beats_admin'],
  handler: async (request: FrameworkRequest): Promise<BaseReturnType | ReturnTypeGet<CMBeat>> => {
    const beatId = request.params.beatId;

    let beat: CMBeat | null;
    if (beatId === 'unknown') {
      beat = await libs.beats.getByEnrollmentToken(request.user, request.params.token);
      if (beat === null) {
        return { success: false };
      }
    } else {
      beat = await libs.beats.getById(request.user, beatId);
      if (beat === null) {
        return { error: { message: 'Beat not found', code: 404 }, success: false };
      }
    }

    delete beat.access_token;

    return {
      item: beat,
      success: true,
    };
  },
});
