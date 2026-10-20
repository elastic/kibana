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
  captureActiveProduct,
  classifyFlagOverrides,
  createEventForwarder,
  createExecutionContextService,
  createForwardingLogger,
  forwardLogLevel,
  createPlatformReplica,
  createReplicaWaitQueue,
  currentExecutionContext,
  emptyPlatformReplicas,
  executionContextOpaqueId,
  taskManagerExecutionContext,
  lookupBooleanFlag,
  parseAnalyticsReport,
  registerForwardedEventType,
  replicaFingerprint,
  runWithExecutionContext,
} from './platform';
export type {
  ExecutionContextValue,
  FeatureFlagReplica,
  FeaturesReplica,
  ForwardedEvent,
  ForwardedLog,
  PlatformReplicas,
  PricingProductReplica,
  PricingReplica,
  ReplicaEnvelope,
  StatusReplica,
} from './platform';
export {
  assertNoInternalRepositoryExtensions,
  ALWAYS_FENCED_TM_METHODS,
  CONFIG_CAPTURE_KEY,
  LOCAL_SCOPED_CLIENT_OPTION_SIGNATURES,
  LOCAL_SO_PAIRS,
  advanceGeneration,
  canonicalClientOptions,
  configKeyPaths,
  CONFIG_OBSERVE_KEY,
  contentHash,
  currentTmPhase,
  decideTaskManagerCall,
  fingerprintSavedObjectType,
  hasExplicitNamespace,
  savedObjectCallOptions,
  providerOptionsAllowed,
  routeSavedObject,
  RUN_BRIDGED_TM_METHODS,
  captureEffectivePluginConfig,
  runInTmPhase,
  toPlainConfig,
  verifyRegistryReadiness,
} from './policies';
export type { ReadinessToken, SoRouteInput, SoTypeFingerprintInput } from './policies';
