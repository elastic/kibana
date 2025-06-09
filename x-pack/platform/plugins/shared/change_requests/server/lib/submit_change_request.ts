/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChangeRequestDoc, ChangeRequestsStorageClient } from '../types';

export async function submitChangeRequest(
  storageClient: ChangeRequestsStorageClient,
  changeRequest: ChangeRequestDoc
) {
  // Should probably perform the same validation the API does of at least one action, and at least one required privilege per action
  return storageClient.index({
    document: {
      request: changeRequest,
    },
  });
}
