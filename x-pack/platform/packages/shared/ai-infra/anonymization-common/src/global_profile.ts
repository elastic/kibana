/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE = 'index' as const;
export const GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID = '__kbn_global_anonymization_profile__';

export const isGlobalAnonymizationProfileTarget = (targetType: string, targetId: string): boolean =>
  targetType === GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE &&
  targetId === GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID;
