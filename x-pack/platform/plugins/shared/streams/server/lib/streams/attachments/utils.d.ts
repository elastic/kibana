import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SanitizedRule } from '@kbn/alerting-types';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { AttachmentLink, AttachmentDocument, AttachmentType, AttachmentData } from './types';
export declare function getAttachmentLinkUuid(attachment: AttachmentLink): string;
export declare const getAttachmentDocument: (attachment: {
    id: string;
    type: AttachmentType;
    streamNames: string[];
    uuid: string;
}) => AttachmentDocument;
export declare const processRuleResults: (rules: SanitizedRule[]) => AttachmentData[];
/**
 * Map of saved object types for each attachment type when querying across all spaces.
 * TypeScript will enforce that all attachment types have corresponding saved object types.
 */
export declare const attachmentTypeToSavedObjectTypeMap: Record<AttachmentType, string>;
/**
 * Fetches saved objects by IDs for dashboards and SLOs only.
 * Rules use the rule client instead.
 */
export declare const getSoByIds: ({ soClient, attachmentType, ids, }: {
    soClient: SavedObjectsClientContract;
    attachmentType: Extract<AttachmentType, "dashboard" | "slo">;
    ids: string[];
}) => Promise<AttachmentData[]>;
/**
 * Fetches rules by IDs using the rules client.
 */
export declare const getRulesByIds: ({ rulesClient, ids, }: {
    rulesClient: RulesClient;
    ids: string[];
}) => Promise<AttachmentData[]>;
/**
 * Searches for suggested saved objects for dashboards and SLOs only.
 * Rules use the rule client instead.
 */
export declare const getSuggestedSo: ({ soClient, attachmentType, query, tags, limit, excludeIds, }: {
    soClient: SavedObjectsClientContract;
    attachmentType: Extract<AttachmentType, "dashboard" | "slo">;
    query: string;
    tags?: string[];
    limit: number;
    excludeIds?: string[];
}) => Promise<AttachmentData[]>;
/**
 * Searches for suggested rules.
 */
export declare const getSuggestedRules: ({ rulesClient, query, tags, limit, excludeIds, }: {
    rulesClient: RulesClient;
    query: string;
    tags?: string[];
    limit: number;
    excludeIds?: string[];
}) => Promise<AttachmentData[]>;
