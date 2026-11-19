/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface GetIsEceParams {
  isCloudEnabled: boolean;
  isServerlessEnabled: boolean;
  isSaasContainer?: boolean;
}

export function getIsEce({
  isCloudEnabled,
  isServerlessEnabled,
  isSaasContainer,
}: GetIsEceParams): boolean | undefined {
  if (isSaasContainer != null) {
    return !isSaasContainer;
  }

  if (isCloudEnabled && !isServerlessEnabled) {
    return true;
  }

  return undefined;
}
