import type { RuleAttachmentData, CreateRuleData } from '@kbn/alerting-v2-schemas';
/**
 * Maps partial rule attachment data to the API request payload,
 * filling in required defaults for missing fields. Used by both the canvas
 * save/update flow and the server-side validation operation.
 */
export declare const buildRulePayload: (data: Partial<RuleAttachmentData>) => CreateRuleData;
