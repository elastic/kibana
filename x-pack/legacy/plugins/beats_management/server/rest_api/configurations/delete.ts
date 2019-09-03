/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { ReturnTypeBulkDelete } from '../../../common/return_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

export const createDeleteConfidurationsRoute = (libs: CMServerLibs) => ({
  method: 'DELETE',
  path: '/api/beats/configurations/{ids}',
  requiredRoles: ['beats_admin'],
  licenseRequired: REQUIRED_LICENSES,
  handler: async (request: FrameworkRequest): Promise<ReturnTypeBulkDelete> => {
    const idString: string = request.params.ids;
    const ids = idString.split(',').filter((id: string) => id.length > 0);

    const results = await libs.configurationBlocks.delete(request.user, ids);

    return {
      success: true,
      results: results.map(result => ({
        success: result.success,
        action: 'deleted',
        error: result.success ? undefined : { message: result.reason },
      })),
    } as ReturnTypeBulkDelete;
  },
});
