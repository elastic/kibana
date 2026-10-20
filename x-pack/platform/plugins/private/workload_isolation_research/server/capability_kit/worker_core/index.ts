/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ALERTING_BOOT_ES_WRITE_ALLOW, createBootEsWriteFence, isEsWrite } from './es_write_fence';
export type {
  BootEsWriteFence,
  EsRequestRecord,
  EsWriteAllow,
  EsWriteSummary,
} from './es_write_fence';
export {
  NAMED_EVENT_EXCLUSIONS,
  classifyFlagOverrides,
  createEventForwarder,
  createExecutionContextService,
  createForwardingLogger,
  createPlatformReplica,
  currentExecutionContext,
  emptyPlatformReplicas,
  lookupBooleanFlag,
  runWithExecutionContext,
} from './platform';
export type {
  FeatureFlagReplica,
  FeaturesReplica,
  ForwardedEvent,
  ForwardedLog,
  PlatformReplicas,
  PricingReplica,
  ReplicaEnvelope,
  StatusReplica,
} from './platform';
export {
  ALWAYS_FENCED_TM_METHODS,
  CONFIG_CAPTURE_KEY,
  LOCAL_SCOPED_CLIENT_OPTION_SIGNATURES,
  LOCAL_SO_PAIRS,
  canonicalClientOptions,
  configKeyPaths,
  currentTmPhase,
  decideTaskManagerCall,
  fingerprintSavedObjectType,
  hasExplicitNamespace,
  savedObjectCallOptions,
  providerOptionsAllowed,
  routeSavedObject,
  runInTmPhase,
  toPlainConfig,
  verifyRegistryReadiness,
} from './policies';
export type { ReadinessToken, SoRouteInput, SoTypeFingerprintInput } from './policies';
