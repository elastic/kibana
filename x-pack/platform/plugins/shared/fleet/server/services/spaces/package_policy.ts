/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../common/constants';

import { appContextService } from '../app_context';

export async function updatePackagePolicySpaces({
  packagePolicyId,
  currentSpaceId,
  newSpaceIds,
}: {
  packagePolicyId: string;
  currentSpaceId: string;
  newSpaceIds: string[];
}) {
  const soClientWithoutSpaceExtension =
    appContextService.getInternalUserSOClientWithoutSpaceExtension();

  const results = await soClientWithoutSpaceExtension.updateObjectsSpaces(
    [
      {
        id: packagePolicyId,
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      },
    ],
    newSpaceIds,
    newSpaceIds.length === 1 && newSpaceIds[0] === ALL_SPACES_ID ? [currentSpaceId] : [],
    { refresh: 'wait_for', namespace: currentSpaceId }
  );

  for (const soRes of results.objects) {
    if (soRes.error) {
      throw soRes.error;
    }
  }
}
