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
import { FleetServerLib } from '../../libs/types';

export const createDeleteAgentsRoute = (libs: FleetServerLib) => ({
  method: 'DELETE',
  config: {
    auth: false,
  },
  path: '/api/fleet/agents/{id}',
  handler: async (
    request: FrameworkRequest<{ params: { id: string } }>,
    h: FrameworkResponseToolkit
  ): Promise<ReturnTypeDelete | BaseReturnType | FrameworkResponseObject> => {
    const { id } = request.params;

    const agent = await libs.agents.getById(id);
    if (!agent) {
      return h
        .response({ error: { message: 'Agent not found', code: 404 }, success: false })
        .code(404);
    }

    return { success: true, action: 'deleted' };
  },
});
