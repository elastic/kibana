/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FrameworkRequest,
  FrameworkResponseToolkit,
  FrameworkResponseObject,
} from '../../libs/adapters/framework/adapter_types';
import { ReturnTypeDelete, BaseReturnType } from '../../../common/return_types';
import { FleetServerLibRequestFactory } from '../../libs/compose/types';

export const createDeleteAgentsRoute = (libsFactory: FleetServerLibRequestFactory) => ({
  method: 'DELETE',
  config: {},
  path: '/api/fleet/agents/{id}',
  handler: async (
    request: FrameworkRequest<{ params: { id: string } }>,
    h: FrameworkResponseToolkit
  ): Promise<ReturnTypeDelete | BaseReturnType | FrameworkResponseObject> => {
    const { id } = request.params;
    const { agents } = libsFactory(request);
    const agent = await agents.getById(id);
    if (!agent) {
      return h
        .response({ error: { message: 'Agent not found', code: 404 }, success: false })
        .code(404);
    }

    return { success: true, action: 'deleted' };
  },
});
