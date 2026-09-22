/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilesApiError } from '../errors';
import { isProfilesApiError } from '../errors';

export const getConflictState = (
  error: unknown
): { isConflict: boolean; error?: ProfilesApiError } => {
  const mapped = isProfilesApiError(error) ? error : undefined;

  return {
    isConflict: mapped?.kind === 'conflict',
    error: mapped,
  };
};
