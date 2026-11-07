/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { INVESTIGATIONS_INTERNAL_URL } from '../investigations/constants';

/**
 * The Cases attachment type that links an investigation to a case. A reference, not a copy: the
 * attachment id is the investigation's conversation id, and the case reads the investigation live.
 */
export const INVESTIGATION_CASE_ATTACHMENT_TYPE = 'agentic.investigation' as const;

/** Cases opened from AlertZero carry this source and this tag. */
export const ALERTZERO_CASE_SOURCE = 'alertzero' as const;
export const ALERTZERO_CASE_TAG = 'alertzero' as const;

/** Bridge cases are Security cases. */
export const ALERTZERO_CASE_OWNER = 'securitySolution' as const;

/** The shipped AI investigation case template (written by Cases per space). */
export const AI_INVESTIGATION_TEMPLATE_ID = 'system-ai-investigation';

export const INVESTIGATION_OPEN_CASE_URL =
  `${INVESTIGATIONS_INTERNAL_URL}/{id}/_open_case` as const;
export const INVESTIGATION_LINK_CASE_URL =
  `${INVESTIGATIONS_INTERNAL_URL}/{id}/_link_case` as const;

/** Recorded on each linked investigation's timeline, and shown to the agent. */
export const INVESTIGATION_LINKED_TO_CASE_EVENT_TYPE = 'investigation_linked_to_case' as const;

/** Most investigations one Open a case request links; Cases bulk-creates up to 100 attachments. */
export const MAX_INVESTIGATIONS_PER_CASE_REQUEST = 50;

/** Advanced setting: closing the last open linked investigation also closes the case. */
export const CLOSE_CASE_WHEN_INVESTIGATIONS_CLOSE_SETTING =
  'agenticInvestigations:closeCaseWhenInvestigationsClose' as const;

/**
 * Next-up (Phase 5, off by default): a Worker's investigation also opens a case, and its proposals,
 * hypotheses, and impact land on that case. Per space.
 */
export const OPEN_CASES_FOR_INVESTIGATIONS_SETTING =
  'agenticInvestigations:openCasesForInvestigations' as const;

/** Visibility of the cases opened for investigations: `public` (default) or `restricted`. */
export const OPEN_CASES_FOR_INVESTIGATIONS_VISIBILITY_SETTING =
  'agenticInvestigations:openCasesForInvestigationsVisibility' as const;

/** A decision on the case: a reference to a proposal raised in a linked investigation. */
export const PROPOSAL_CASE_ATTACHMENT_TYPE = 'agentic.proposal' as const;

/**
 * The investigation's impact and hypotheses, copied onto the case when they're written. The one
 * place the POC copies instead of linking: one attachment per investigation, replaced on change.
 */
export const IMPACT_CASE_ATTACHMENT_TYPE = 'agentic.impact' as const;
export const HYPOTHESES_CASE_ATTACHMENT_TYPE = 'agentic.hypotheses' as const;

export const CASE_DECISIONS_URL =
  `${INVESTIGATIONS_INTERNAL_URL}/cases/{case_id}/decisions` as const;
export const CASE_DECISION_URL =
  `${INVESTIGATIONS_INTERNAL_URL}/cases/{case_id}/decisions/{proposal_id}` as const;

export const proposalCaseAttachmentPayloadSchema = z
  .object({
    type: z.literal(PROPOSAL_CASE_ATTACHMENT_TYPE),
    owner: z.string().max(256),
    attachmentId: z.string().min(1).max(1024),
    metadata: z
      .object({
        title: z.string().max(1024).optional(),
        investigation_id: z.string().max(1024).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const MAX_COPIED_TEXT = 10_000;

export const impactCaseAttachmentPayloadSchema = z
  .object({
    type: z.literal(IMPACT_CASE_ATTACHMENT_TYPE),
    owner: z.string().max(256),
    data: z
      .object({
        investigation_id: z.string().min(1).max(1024),
        investigation_title: z.string().max(1024).optional(),
        summary: z.string().max(MAX_COPIED_TEXT).optional(),
        entities: z
          .array(
            z
              .object({
                id: z.string().max(1024),
                name: z.string().max(1024).optional(),
                type: z.string().max(256).optional(),
              })
              .strict()
          )
          .max(100),
        copied_at: z.string().max(64),
      })
      .strict(),
  })
  .strict();
export type ImpactCaseAttachmentData = z.infer<typeof impactCaseAttachmentPayloadSchema>['data'];

export const hypothesesCaseAttachmentPayloadSchema = z
  .object({
    type: z.literal(HYPOTHESES_CASE_ATTACHMENT_TYPE),
    owner: z.string().max(256),
    data: z
      .object({
        investigation_id: z.string().min(1).max(1024),
        investigation_title: z.string().max(1024).optional(),
        hypotheses: z
          .array(
            z
              .object({
                candidate: z.string().max(MAX_COPIED_TEXT),
                status: z.enum(['investigating', 'dismissed', 'confirmed']),
                confidence: z.number().min(0).max(1).optional(),
                reason: z.string().max(MAX_COPIED_TEXT).optional(),
              })
              .strict()
          )
          .max(50),
        copied_at: z.string().max(64),
      })
      .strict(),
  })
  .strict();
export type HypothesesCaseAttachmentData = z.infer<
  typeof hypothesesCaseAttachmentPayloadSchema
>['data'];

export const caseDecisionRequestSchema = lazySchema(() =>
  z.object({
    decision: z.enum(['approve', 'dismiss']),
  })
);
export type CaseDecisionRequest = z.infer<typeof caseDecisionRequestSchema>;

export interface CaseDecisionPerson {
  username?: string | null;
  full_name?: string | null;
}

export interface CaseDecision {
  proposal_id: string;
  title: string;
  comment?: string;
  category?: string;
  investigation_id?: string;
  /** `pending` until decided; then the proposal's own status (`approved`, `dismissed`, ...). */
  status: string;
  decision?: 'approved' | 'dismissed';
  created_at?: string;
  created_by?: CaseDecisionPerson;
  decided_at?: string;
  decided_by?: CaseDecisionPerson;
}

export const CASE_DECISIONS_MAX_PER_PAGE = 100;

export const caseDecisionsQuerySchema = lazySchema(() =>
  z.object({
    status: z.enum(['pending', 'decided']).default('pending'),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    per_page: z.coerce.number().int().min(1).max(CASE_DECISIONS_MAX_PER_PAGE).default(20),
    search: z.string().trim().max(256).optional(),
    investigation_id: z.string().max(1024).optional(),
  })
);
export interface CaseDecisionsQuery {
  status?: 'pending' | 'decided';
  page?: number;
  per_page?: number;
  search?: string;
  investigation_id?: string;
}

export interface CaseDecisionsResponse {
  /** One page of the decisions matching `status`, `search`, and `investigation_id`. */
  decisions: CaseDecision[];
  /** All decisions matching the query, across pages. */
  total: number;
  /** Decisions on the case still waiting on someone, regardless of the query. */
  pending: number;
  /** Decisions on the case already decided or expired, regardless of the query. */
  decided: number;
  /** The caller can approve and dismiss (proposals manage and Cases update). */
  can_decide: boolean;
}

export const investigationCaseAttachmentMetadataSchema = z
  .object({
    title: z.string().max(1024).optional(),
    workerId: z.string().max(1024).optional(),
    linkedBy: z.string().max(1024).optional(),
  })
  .strict();

export const investigationCaseAttachmentPayloadSchema = z
  .object({
    type: z.literal(INVESTIGATION_CASE_ATTACHMENT_TYPE),
    owner: z.string().max(256),
    attachmentId: z.string().min(1).max(1024),
    metadata: investigationCaseAttachmentMetadataSchema.optional(),
  })
  .strict();

export type InvestigationCaseAttachmentPayload = z.infer<
  typeof investigationCaseAttachmentPayloadSchema
>;

export const caseVisibilitySchema = lazySchema(() => z.enum(['public', 'restricted']));
export type CaseVisibility = z.infer<typeof caseVisibilitySchema>;

export const openCaseRequestSchema = lazySchema(() =>
  z.object({
    title: z.string().trim().min(1).max(160),
    template_id: z.string().max(1024).optional(),
    visibility: caseVisibilitySchema,
    /** User profile uids. The requester is always added. */
    assignees: z.array(z.string().min(1).max(1024)).max(10).default([]),
    /** Other investigations to link; the investigation in the path is always linked. */
    linked_investigation_ids: z
      .array(z.string().min(1).max(1024))
      .max(MAX_INVESTIGATIONS_PER_CASE_REQUEST)
      .default([]),
    push: z.boolean().default(false),
  })
);
export type OpenCaseRequest = z.input<typeof openCaseRequestSchema>;

export const linkCaseRequestSchema = lazySchema(() =>
  z.object({
    case_id: z.string().min(1).max(1024),
  })
);
export type LinkCaseRequest = z.infer<typeof linkCaseRequestSchema>;

export interface LinkedInvestigationResult {
  id: string;
  /** Why linking this investigation failed; missing when it was linked. */
  error?: string;
}

export interface OpenCaseResponse {
  case_id: string;
  case_title: string;
  incremental_id?: number | null;
  linked: LinkedInvestigationResult[];
  /** True when the case was pushed to its connector when it opened. */
  pushed: boolean;
  /** The connector the case pushes to; missing when it has none. */
  connector_name?: string;
}

export interface LinkCaseResponse {
  case_id: string;
  case_title: string;
  incremental_id?: number | null;
  investigation_id: string;
}

export const investigationLinkedToCaseEventSchema = lazySchema(() =>
  z.object({
    case_id: z.string(),
    case_title: z.string(),
    /** True when this investigation is the one the case was opened from. */
    opened_from_here: z.boolean().optional(),
  })
);
export type InvestigationLinkedToCaseEventData = z.infer<
  typeof investigationLinkedToCaseEventSchema
>;

const VERDICT_PREFIXES: Array<[RegExp, AiVerdictValue]> = [
  [/^true[\s_-]?positive\b/i, 'true_positive'],
  [/^false[\s_-]?positive\b/i, 'false_positive'],
  [/^benign[\s_-]?(positive)?\b/i, 'benign_positive'],
  [/^suspicious\b/i, 'suspicious'],
  [/^undetermined\b|^inconclusive\b/i, 'undetermined'],
];

export type AiVerdictValue =
  | 'true_positive'
  | 'false_positive'
  | 'benign_positive'
  | 'suspicious'
  | 'undetermined';

/**
 * Investigation verdicts are free text. A case's AI verdict is only taken from one when the text
 * starts with a verdict label ("True positive: ..."); anything else leaves the case's AI verdict
 * empty rather than guessing.
 */
export const parseAiVerdict = (verdictText?: string | null): AiVerdictValue | undefined => {
  const text = verdictText?.trim();
  if (!text) {
    return undefined;
  }
  return VERDICT_PREFIXES.find(([pattern]) => pattern.test(text))?.[1];
};
