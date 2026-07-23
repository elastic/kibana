/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { QUERY_STATUSES } from './queries';
export type { Query, QueryStatus } from './queries';

export {
  STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG,
  SIGNIFICANT_EVENTS_SEMANTIC_CODE_SEARCH_GROUNDING_ENABLED_FLAG,
  STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG,
} from './feature_flags';

export {
  SIGNIFICANT_EVENT_TIERED_FEATURES,
  SIGNIFICANT_EVENTS_TIERED_FEATURE,
  // backward-compat alias used by streams_app and serverless_observability
  SIGNIFICANT_EVENTS_TIERED_FEATURE as STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE,
  ATTACHMENT_SUGGESTIONS_LIMIT,
  DEFAULT_EXTRACTION_INTERVAL_HOURS,
  MIN_EXTRACTION_INTERVAL_HOURS,
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_TARGET_COVERAGE_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE,
  DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES,
  DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_TRIAGE_BATCH_SIZE,
  MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
  MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES,
  MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
} from './constants';

export {
  SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
  SIGNIFICANT_EVENT_SML_TYPE,
  type SignificantEventAttachment,
  type PendingSignificantEventAttachment,
} from './significant_event_attachment';

export {
  KI_FEATURE_ATTACHMENT_TYPE,
  decodeFeatureAttachmentOrigin,
  encodeFeatureAttachmentOrigin,
  type KiFeatureAttachment,
  type PendingKiFeatureAttachment,
} from './ki_feature_attachment';

export {
  SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
  type SignificantEventDetectionAttachment,
  type PendingSignificantEventDetectionAttachment,
} from './significant_event_detection_attachment';

export { SIGNIFICANT_EVENTS_REQUIRED_PLUGINS } from './significant_events_availability';
export type {
  SignificantEventsRequiredPlugin,
  SignificantEventsUnavailableReason,
  SignificantEventsAvailabilityResponse,
} from './significant_events_availability';

export { RELAY_APP_CONNECTION_STATUS } from './slack_app/types';
export type {
  RelayAppConnectionStatus,
  SlackAppConnectResponse,
  SlackAppStatusResponse,
  SlackAppDisconnectResponse,
} from './slack_app/types';

export type {
  SignificantEventsMaintenanceFailure,
  SignificantEventsMaintenanceSummary,
  SignificantEventsMaintenanceStatus,
  SignificantEventsMaintenanceFeatureSettings,
} from './maintenance/types';

export {
  DEFAULT_MAINTENANCE_STATE,
  isMaintenanceState,
  stateBlocksNewActivity,
} from './maintenance/state_machine';
export type { SignificantEventsMaintenanceState } from './maintenance/state_machine';
