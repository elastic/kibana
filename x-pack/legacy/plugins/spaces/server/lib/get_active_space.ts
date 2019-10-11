/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Space } from '../../common/model/space';
import { wrapError } from './errors';
import { SpacesClient } from './spaces_client';
import { getSpaceIdFromPath } from '../../common';

export async function getActiveSpace(
  spacesClient: SpacesClient,
  requestBasePath: string,
  serverBasePath: string
): Promise<Space> {
  const spaceId = getSpaceIdFromPath(requestBasePath, serverBasePath);

  try {
    return spacesClient.get(spaceId);
  } catch (e) {
    throw wrapError(e);
  }
}
