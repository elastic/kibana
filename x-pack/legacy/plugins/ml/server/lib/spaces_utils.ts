/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { getActiveSpace } from '../../../spaces/server/lib/get_active_space';
import { Space } from '../../../spaces/common/model/space';

interface GetActiveSpaceResponse {
  valid: boolean;
  space?: Space;
}

export function spacesUtilsProvider(spacesPlugin: any, request: Request, config: KibanaConfig) {
  async function activeSpace(): Promise<GetActiveSpaceResponse> {
    const spacesClient = await spacesPlugin.getScopedSpacesClient(request);
    try {
      return {
        valid: true,
        space: await getActiveSpace(
          spacesClient,
          request.getBasePath(),
          config.get('server.basePath')
        ),
      };
    } catch (e) {
      return {
        valid: false,
      };
    }
  }

  async function isMlEnabled(): Promise<boolean> {
    const { valid, space } = await activeSpace();
    if (valid === true && space !== undefined) {
      return space.disabledFeatures.includes('ml') === false;
    }
    return true;
  }

  return { isMlEnabled };
}
