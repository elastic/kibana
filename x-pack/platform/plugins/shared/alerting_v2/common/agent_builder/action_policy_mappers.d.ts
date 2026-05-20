import type { ActionPolicyAttachmentData, CreateActionPolicyData } from '@kbn/alerting-v2-schemas';
/**
 * Maps partial action policy attachment data to the API request payload,
 * filling in required defaults for missing fields. Used by both the canvas
 * save/update flow and the server-side validation operation.
 */
export declare const buildActionPolicyPayload: (data: Partial<ActionPolicyAttachmentData>) => CreateActionPolicyData;
