/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  AnonymizationProfile,
  AnonymizationProfileRules,
  CreateAnonymizationProfileRequest,
  UpdateAnonymizationProfileRequest,
  FindAnonymizationProfilesQuery,
  FieldRule,
  RegexRule,
  NerRule,
  EffectiveFieldPolicy,
  EffectivePolicy,
  ReplacementsSet,
  TokenSourceEntry,
  TokenSourceRef,
} from './src/types';

export {
  anonymizationProfileSchema,
  anonymizationProfileRulesSchema,
  createAnonymizationProfileRequestSchema,
  updateAnonymizationProfileRequestSchema,
  findAnonymizationProfilesQuerySchema,
  fieldRuleSchema,
  regexRuleSchema,
  nerRuleSchema,
  replacementsSetSchema,
  tokenSourceEntrySchema,
  tokenSourceRefSchema,
  tokenSourceTypeSchema,
  anonymizationEntityClassSchema,
  nerEntityClassSchema,
  ANONYMIZATION_ENTITY_CLASSES,
  NER_ENTITY_CLASSES,
  TOKEN_SOURCE_TYPES,
  NER_MODEL_ID,
} from './src/schemas';

export type { AnonymizationEntityClass, NerEntityClass, TokenSourceType } from './src/schemas';

export { generateToken } from './src/generate_token';
export { replaceTokensWithOriginals } from './src/replace_tokens_with_originals';
export { resolveEffectivePolicy } from './src/resolve_effective_policy';
export {
  GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE,
  GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
  isGlobalAnonymizationProfileTarget,
} from './src/global_profile';
export {
  suggestEntityClassForField,
  ECS_ENTITY_CLASS_MAP,
} from './src/ecs_entity_class_suggestions';
export * from './impl/schemas';
