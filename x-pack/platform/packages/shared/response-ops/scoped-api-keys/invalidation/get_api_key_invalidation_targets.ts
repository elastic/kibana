/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ApiKeyInvalidationTarget {
  apiKeyId: string;
  uiamApiKey?: string;
}

export interface GetApiKeyInvalidationTargetsOpts {
  createdByUser: boolean;
  esApiKeyId?: string;
  uiamApiKeyId?: string;
  uiamApiKey?: string;
}

/**
 * Returns the ES and UIAM keys a consumer owns and must invalidate. A user-created key is never
 * invalidated, and `createdByUser` gates the ES and UIAM keys together.
 */
export const getApiKeyInvalidationTargets = ({
  createdByUser,
  esApiKeyId,
  uiamApiKeyId,
  uiamApiKey,
}: GetApiKeyInvalidationTargetsOpts): ApiKeyInvalidationTarget[] => {
  if (createdByUser) {
    return [];
  }

  const targets: ApiKeyInvalidationTarget[] = [];

  if (esApiKeyId !== undefined) {
    targets.push({ apiKeyId: esApiKeyId });
  }

  if (uiamApiKeyId && uiamApiKey) {
    targets.push({ apiKeyId: uiamApiKeyId, uiamApiKey });
  }

  return targets;
};
