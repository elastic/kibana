import { z } from '@kbn/zod/v4';
import { type RuleResponse } from './rule_data_schema';
/**
 * Query params for `GET …/change_history/rules`.
 *
 * `rule_id` is singular because each row's diff is computed against its
 * predecessor in the same rule's stream; interleaving rules would diff
 * unrelated configurations.
 *
 * Pagination mirrors execution-history: 1-based `page`, bounded `per_page`,
 * and a max result window guard so callers cannot page arbitrarily deep.
 */
export declare const listRuleChangeHistoryRequestSchema: z.ZodObject<{
    rule_id: z.ZodString;
    page: z.ZodDefault<z.ZodPreprocess<z.ZodNumber>>;
    per_page: z.ZodDefault<z.ZodPreprocess<z.ZodNumber>>;
}, z.core.$strict>;
export type ListRuleChangeHistoryRequest = z.infer<typeof listRuleChangeHistoryRequestSchema>;
/** Path params for `GET …/change_history/rules/{change_id}`. */
export declare const getRuleChangeHistoryEventParamsSchema: z.ZodObject<{
    change_id: z.ZodString;
}, z.core.$strict>;
export type GetRuleChangeHistoryEventParams = z.infer<typeof getRuleChangeHistoryEventParamsSchema>;
/**
 * Query params for `GET …/change_history/rules/{change_id}`.
 *
 * `change_id` alone identifies the event; `rule_id` is here only because the
 * one read API `@kbn/change-history` exposes always filters on an object id.
 * Tracked for removal in https://github.com/elastic/kibana/issues/292882.
 */
export declare const getRuleChangeHistoryEventQuerySchema: z.ZodObject<{
    rule_id: z.ZodString;
}, z.core.$strict>;
export type GetRuleChangeHistoryEventQuery = z.infer<typeof getRuleChangeHistoryEventQuerySchema>;
/**
 * Actor for a change-history row. Unattributed writes may carry an empty
 * `name` (the write path stores `username ?? ''`).
 */
export declare const ruleChangeHistoryActorSchema: z.ZodObject<{
    name: z.ZodString;
    profile_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type RuleChangeHistoryActor = z.infer<typeof ruleChangeHistoryActorSchema>;
/**
 * Rule lifecycle actions recorded by the change-history write path. `unknown`
 * is the read fallback for a document written by a newer version: the row is
 * still returned so the audit trail stays complete.
 */
export declare const ruleChangeHistoryActionSchema: z.ZodEnum<{
    rule_create: "rule_create";
    rule_delete: "rule_delete";
    rule_disable: "rule_disable";
    rule_enable: "rule_enable";
    rule_update: "rule_update";
    unknown: "unknown";
}>;
export type RuleChangeHistoryAction = z.infer<typeof ruleChangeHistoryActionSchema>;
/**
 * Server-computed diff vs the chronologically older version. `summary` is an
 * RFC 7396 JSON Merge Patch of previous values (opaque to the UI package).
 */
export declare const ruleChangeHistoryChangesSchema: z.ZodObject<{
    count: z.ZodNumber;
    summary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type RuleChangeHistoryChanges = z.infer<typeof ruleChangeHistoryChangesSchema>;
/**
 * List row DTO.
 * Intentionally omits the full rule snapshot; that lives on the detail response.
 */
export declare const ruleChangeHistoryListItemSchema: z.ZodObject<{
    id: z.ZodString;
    created_at: z.ZodISODateTime;
    actor: z.ZodObject<{
        name: z.ZodString;
        profile_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    action: z.ZodEnum<{
        rule_create: "rule_create";
        rule_delete: "rule_delete";
        rule_disable: "rule_disable";
        rule_enable: "rule_enable";
        rule_update: "rule_update";
        unknown: "unknown";
    }>;
    changes: z.ZodOptional<z.ZodObject<{
        count: z.ZodNumber;
        summary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>;
    comment: z.ZodOptional<z.ZodString>;
    is_current: z.ZodOptional<z.ZodBoolean>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    version: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type RuleChangeHistoryListItem = z.infer<typeof ruleChangeHistoryListItemSchema>;
export declare const listRuleChangeHistoryResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        created_at: z.ZodISODateTime;
        actor: z.ZodObject<{
            name: z.ZodString;
            profile_id: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        action: z.ZodEnum<{
            rule_create: "rule_create";
            rule_delete: "rule_delete";
            rule_disable: "rule_disable";
            rule_enable: "rule_enable";
            rule_update: "rule_update";
            unknown: "unknown";
        }>;
        changes: z.ZodOptional<z.ZodObject<{
            count: z.ZodNumber;
            summary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>>;
        comment: z.ZodOptional<z.ZodString>;
        is_current: z.ZodOptional<z.ZodBoolean>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        version: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export type ListRuleChangeHistoryResponse = z.infer<typeof listRuleChangeHistoryResponseSchema>;
/**
 * Rule configuration snapshot at the time of the change.
 *
 * Runtime validation is intentionally permissive (`z.record`) so older
 * snapshots that predate schema changes do not fail response validation in
 * development. The TypeScript type is narrowed to the write-path snapshot
 * shape for autocomplete. Same rationale as alerting v1 `get_rule_history`.
 */
export type RuleChangeHistorySnapshot = RuleResponse;
/**
 * Detail DTO
 */
export declare const ruleChangeHistoryDetailSchema: z.ZodObject<{
    id: z.ZodString;
    created_at: z.ZodISODateTime;
    actor: z.ZodObject<{
        name: z.ZodString;
        profile_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    action: z.ZodEnum<{
        rule_create: "rule_create";
        rule_delete: "rule_delete";
        rule_disable: "rule_disable";
        rule_enable: "rule_enable";
        rule_update: "rule_update";
        unknown: "unknown";
    }>;
    changes: z.ZodOptional<z.ZodObject<{
        count: z.ZodNumber;
        summary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>;
    comment: z.ZodOptional<z.ZodString>;
    is_current: z.ZodOptional<z.ZodBoolean>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    version: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodOptional<z.ZodString>;
    snapshot: z.ZodType<Record<string, unknown> | {
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            tags?: string[] | undefined;
            routing_tags?: string[] | undefined;
            builder?: {
                type: string;
            } | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        query: {
            base: string;
            breach?: {
                segment: string;
            } | undefined;
        };
        recovery?: {
            strategy: "no_breach";
        } | {
            strategy: "condition";
            segment: string;
        } | {
            strategy: "query";
            query: string;
        } | {
            strategy: "manual";
        } | undefined;
        no_data?: {
            strategy: "ignore";
        } | {
            strategy: "alert" | "keep_last" | "resolve";
            query?: string | undefined;
        } | undefined;
        grouping?: {
            fields: string[];
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            data: Record<string, unknown>;
        }[] | undefined;
        state_transition?: {
            pending?: {
                count?: number | undefined;
                timeframe?: string | undefined;
                operator?: "and" | "or" | undefined;
            } | undefined;
            recovering?: {
                count?: number | undefined;
                timeframe?: string | undefined;
                operator?: "and" | "or" | undefined;
            } | undefined;
        } | undefined;
        id: string;
        version: number;
        enabled: boolean;
        created_by: {
            profile_uid: string | null;
        } | null;
        created_at: string;
        updated_by: {
            profile_uid: string | null;
        } | null;
        updated_at: string;
    }, unknown, z.core.$ZodTypeInternals<Record<string, unknown> | {
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            tags?: string[] | undefined;
            routing_tags?: string[] | undefined;
            builder?: {
                type: string;
            } | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        query: {
            base: string;
            breach?: {
                segment: string;
            } | undefined;
        };
        recovery?: {
            strategy: "no_breach";
        } | {
            strategy: "condition";
            segment: string;
        } | {
            strategy: "query";
            query: string;
        } | {
            strategy: "manual";
        } | undefined;
        no_data?: {
            strategy: "ignore";
        } | {
            strategy: "alert" | "keep_last" | "resolve";
            query?: string | undefined;
        } | undefined;
        grouping?: {
            fields: string[];
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            data: Record<string, unknown>;
        }[] | undefined;
        state_transition?: {
            pending?: {
                count?: number | undefined;
                timeframe?: string | undefined;
                operator?: "and" | "or" | undefined;
            } | undefined;
            recovering?: {
                count?: number | undefined;
                timeframe?: string | undefined;
                operator?: "and" | "or" | undefined;
            } | undefined;
        } | undefined;
        id: string;
        version: number;
        enabled: boolean;
        created_by: {
            profile_uid: string | null;
        } | null;
        created_at: string;
        updated_by: {
            profile_uid: string | null;
        } | null;
        updated_at: string;
    }, unknown>>;
}, z.core.$strip>;
export type RuleChangeHistoryDetail = Omit<z.infer<typeof ruleChangeHistoryDetailSchema>, 'snapshot'> & {
    snapshot: RuleChangeHistorySnapshot | Record<string, unknown>;
};
