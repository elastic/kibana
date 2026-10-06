import { z } from '@kbn/zod/v4';
import type { ProposalConfidence, ProposalImpact, ProposalStatus } from '@kbn/proposals-common';
import type { InvestigationEvidence } from '../evidence/evidence';
import type { Hypothesis } from '../hypotheses/hypotheses';
import type { AlertSubjectSnapshot, InvestigationSubjectTriggerType, InvestigationSubjectType, SlackThreadSubject } from '../subjects/subject';
import { INVESTIGATION_METADATA_STATUSES, INVESTIGATION_SEVERITIES, INVESTIGATION_SEVERITY_NONE, INVESTIGATIONS_SORT_FIELDS } from './constants';
export type InvestigationSeverity = (typeof INVESTIGATION_SEVERITIES)[number];
/** A severity filter value: a severity, or `none` for investigations without one. */
export type InvestigationSeverityFilterValue = InvestigationSeverity | typeof INVESTIGATION_SEVERITY_NONE;
export type InvestigationMetadataStatus = (typeof INVESTIGATION_METADATA_STATUSES)[number];
export type InvestigationsSortField = (typeof INVESTIGATIONS_SORT_FIELDS)[number];
export declare const investigationIdSchema: z.ZodString;
export declare const investigationIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
/** Filters shared by the list and the severity counts. All of them are ANDed. */
export declare const investigationFiltersSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>, z.ZodTransform<string[], string | string[]>>>;
    status: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodEnum<{
        closed: "closed";
        open: "open";
    }>, z.ZodArray<z.ZodEnum<{
        closed: "closed";
        open: "open";
    }>>]>, z.ZodTransform<("closed" | "open")[], "closed" | "open" | ("closed" | "open")[]>>>;
    severity: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodEnum<{
        critical: "critical";
        high: "high";
        low: "low";
        medium: "medium";
        none: "none";
    }>, z.ZodArray<z.ZodEnum<{
        critical: "critical";
        high: "high";
        low: "low";
        medium: "medium";
        none: "none";
    }>>]>, z.ZodTransform<("critical" | "high" | "low" | "medium" | "none")[], "critical" | "high" | "low" | "medium" | "none" | ("critical" | "high" | "low" | "medium" | "none")[]>>>;
    in_progress: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodPipe<z.ZodEnum<{
        false: "false";
        true: "true";
    }>, z.ZodTransform<boolean, "false" | "true">>]>>;
    subject_type: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodEnum<{
        alert: "alert";
        manual: "manual";
        significant_event: "significant_event";
        slack_thread: "slack_thread";
    }>, z.ZodArray<z.ZodEnum<{
        alert: "alert";
        manual: "manual";
        significant_event: "significant_event";
        slack_thread: "slack_thread";
    }>>]>, z.ZodTransform<("alert" | "manual" | "significant_event" | "slack_thread")[], "alert" | "manual" | "significant_event" | "slack_thread" | ("alert" | "manual" | "significant_event" | "slack_thread")[]>>>;
    subject_id: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>, z.ZodTransform<string[], string | string[]>>>;
    entity: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodString>;
    created_after: z.ZodOptional<z.ZodISODateTime>;
    created_before: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strip>;
export type InvestigationFiltersInput = z.input<typeof investigationFiltersSchema>;
export type InvestigationFilters = z.output<typeof investigationFiltersSchema>;
export declare const listInvestigationsQuerySchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>, z.ZodTransform<string[], string | string[]>>>;
    status: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodEnum<{
        closed: "closed";
        open: "open";
    }>, z.ZodArray<z.ZodEnum<{
        closed: "closed";
        open: "open";
    }>>]>, z.ZodTransform<("closed" | "open")[], "closed" | "open" | ("closed" | "open")[]>>>;
    severity: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodEnum<{
        critical: "critical";
        high: "high";
        low: "low";
        medium: "medium";
        none: "none";
    }>, z.ZodArray<z.ZodEnum<{
        critical: "critical";
        high: "high";
        low: "low";
        medium: "medium";
        none: "none";
    }>>]>, z.ZodTransform<("critical" | "high" | "low" | "medium" | "none")[], "critical" | "high" | "low" | "medium" | "none" | ("critical" | "high" | "low" | "medium" | "none")[]>>>;
    in_progress: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodPipe<z.ZodEnum<{
        false: "false";
        true: "true";
    }>, z.ZodTransform<boolean, "false" | "true">>]>>;
    subject_type: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodEnum<{
        alert: "alert";
        manual: "manual";
        significant_event: "significant_event";
        slack_thread: "slack_thread";
    }>, z.ZodArray<z.ZodEnum<{
        alert: "alert";
        manual: "manual";
        significant_event: "significant_event";
        slack_thread: "slack_thread";
    }>>]>, z.ZodTransform<("alert" | "manual" | "significant_event" | "slack_thread")[], "alert" | "manual" | "significant_event" | "slack_thread" | ("alert" | "manual" | "significant_event" | "slack_thread")[]>>>;
    subject_id: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>, z.ZodTransform<string[], string | string[]>>>;
    entity: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodString>;
    created_after: z.ZodOptional<z.ZodISODateTime>;
    created_before: z.ZodOptional<z.ZodISODateTime>;
    sort_field: z.ZodDefault<z.ZodEnum<{
        created_at: "created_at";
        severity: "severity";
        updated_at: "updated_at";
    }>>;
    sort_order: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    per_page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type ListInvestigationsQueryInput = z.input<typeof listInvestigationsQuerySchema>;
export type ListInvestigationsQuery = z.output<typeof listInvestigationsQuerySchema>;
/** The investigation template fields this API reads. A missing status reads as open. */
export interface InvestigationMetadata {
    status: InvestigationMetadataStatus;
    severity?: InvestigationSeverity;
    /** What happened. */
    summary?: string;
    /** The conclusion. */
    verdict?: string;
}
/** What the investigation is about, one entry per subject. */
export interface InvestigationSubjectResponse {
    type: InvestigationSubjectType;
    id: string;
    summary?: string;
    trigger_type?: InvestigationSubjectTriggerType;
    snapshot?: AlertSubjectSnapshot;
    slack?: SlackThreadSubject;
    created_at: string;
    updated_at?: string;
}
export interface InvestigationImpactEntityResponse {
    id: string;
    name?: string;
    type?: string;
    feature_id?: string;
    stream_name?: string;
    evidence?: InvestigationEvidence;
}
export interface InvestigationImpactResponse {
    summary?: string;
    evidence?: InvestigationEvidence;
    entities: InvestigationImpactEntityResponse[];
    created_at: string;
    updated_at?: string;
}
export interface InvestigationHypothesesResponse {
    hypotheses: Hypothesis[];
    created_at: string;
    updated_at?: string;
}
/** A proposed action on the investigation, without its action input or decision details. */
export interface InvestigationProposalSummary {
    id: string;
    title: string;
    comment: string;
    status: ProposalStatus;
    impact: ProposalImpact;
    confidence: ProposalConfidence;
    category?: string;
    created_at: string;
    decided_at?: string;
}
/** An investigation in a list: the conversation, its metadata, subjects, and impact. */
export interface InvestigationSummary {
    /** The conversation id. */
    id: string;
    /** The conversation title, which Agent Builder generates from the investigation's first round. */
    title: string;
    /**
     * Agent Builder has not generated the title yet, so `title` is empty or its placeholder. UIs show
     * a fallback then, such as the first subject.
     */
    title_pending: boolean;
    created_at: string;
    updated_at: string;
    agent_id: string;
    metadata: InvestigationMetadata;
    /** An agent run or a registered driver workflow execution is working on it now. */
    in_progress: boolean;
    subjects: InvestigationSubjectResponse[];
    impact?: InvestigationImpactResponse;
    /**
     * Proposed actions waiting for a decision (pending and not past their deadline). Absent when the proposals plugin is unavailable or
     * the caller may not read proposals.
     */
    pending_proposal_count?: number;
}
/** One investigation, with hypotheses and proposed actions. */
export interface Investigation extends InvestigationSummary {
    hypotheses?: InvestigationHypothesesResponse;
    proposals: InvestigationProposalSummary[];
}
export interface ListInvestigationsResponse {
    results: InvestigationSummary[];
    /** `total` counts at most {@link MAX_INVESTIGATION_CANDIDATES} investigations. */
    pagination: {
        total: number;
        page: number;
        per_page: number;
    };
}
/** Filtered investigations per severity. Investigations without a severity are not counted. */
export type InvestigationSeverityCounts = Record<InvestigationSeverity, number>;
