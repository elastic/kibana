/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { BeatTag } from '../../../common/domain_types';
import { ReturnTypeBulkGet } from '../../../common/return_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

export const createAssignableTagsRoute = (libs: CMServerLibs) => ({
  method: 'GET',
  path: '/api/beats/tags/assignable/{beatIds}',
  requiredRoles: ['beats_admin'],
  licenseRequired: REQUIRED_LICENSES,
  handler: async (request: FrameworkRequest): Promise<ReturnTypeBulkGet<BeatTag>> => {
    const beatIdString: string = request.params.beatIds;
    const beatIds = beatIdString.split(',').filter((id: string) => id.length > 0);

    const beats = await libs.beats.getByIds(request.user, beatIds);
    const tags = await libs.tags.getNonConflictingTags(
      request.user,
      flatten(beats.map(beat => beat.tags))
    );

    return {
      items: tags,
      success: true,
    };
  },
});
