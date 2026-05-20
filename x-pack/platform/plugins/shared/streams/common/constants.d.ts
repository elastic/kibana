import type { PricingProductFeature } from '@kbn/core-pricing-common';
export declare const ASSET_VERSION = 1;
export declare const ATTACHMENT_SUGGESTIONS_LIMIT = 50;
export declare const STREAMS_FEATURE_ID = "streams";
export declare const STREAMS_CONSUMER = "streams";
export declare const STREAMS_PRODUCER = "streams";
export declare const STREAMS_RULE_REGISTRATION_CONTEXT = "streams";
export declare const STREAMS_API_PRIVILEGES: {
    readonly read: "read_stream";
    readonly manage: "manage_stream";
};
export declare const STREAMS_UI_PRIVILEGES: {
    readonly manage: "manage";
    readonly show: "show";
};
/**
 * Tiered features
 */
export declare const STREAMS_TIERED_ML_FEATURE: PricingProductFeature;
export declare const STREAMS_TIERED_AI_FEATURE: PricingProductFeature;
export declare const STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE: PricingProductFeature;
export declare const STREAMS_TIERED_FEATURES: PricingProductFeature[];
export declare const FAILURE_STORE_SELECTOR = "::failures";
export declare const STREAMS_SETTINGS_DOCUMENT_ID = "kibana_streams_settings";
/**
 * Continuous KI extraction workflow
 *
 * A scheduled workflow that periodically identifies knowledge indicators (KI)
 * across eligible streams. It selects streams, schedules feature identification
 * tasks, and polls their status until completion or timeout.
 */
export declare const CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID = "workflow-ad83678a-dba7-55d1-8caa-3010f6f46b81";
export declare const COORDINATOR_INTERVAL_MINUTES = 10;
export declare const DEFAULT_EXTRACTION_INTERVAL_HOURS = 12;
export declare const MIN_EXTRACTION_INTERVAL_HOURS = 0;
export declare const MAX_SCHEDULED_STREAMS = 5;
export declare const POLL_DELAY_SECONDS = 5;
