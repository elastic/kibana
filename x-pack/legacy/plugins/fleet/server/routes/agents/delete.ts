/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FrameworkRequest,
  FrameworkResponseToolkit,
  FrameworkResponseObject,
} from '../../adapters/framework/adapter_types';
import { ReturnTypeDelete, BaseReturnType } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';

export const createDeleteAgentsRoute = (libs: FleetServerLib) => ({
  method: 'DELETE',
  path: '/api/fleet/agents/{id}',
  options: {
    tags: ['access:fleet-all'],
  },
  handler: async (
    request: FrameworkRequest<{ params: { id: string } }>,
    h: FrameworkResponseToolkit
  ): Promise<ReturnTypeDelete | BaseReturnType | FrameworkResponseObject> => {
    const { id } = request.params;
    const agent = await libs.agents.getById(request.user, id);
    if (!agent) {
      return h
        .response({ error: { message: 'Agent not found', code: 404 }, success: false })
        .code(404);
    }

    await libs.agents.delete(request.user, agent);

    return { success: true, action: 'deleted' };
  },
});
