/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { CaseStatuses } from '@kbn/cases-components/src/status/types';
import { Settings } from '../../../bundled-types.gen';
import {
  CASE_EXTENDED_FIELDS,
  CASE_EXTENDED_FIELDS_LABELS,
  CASE_EXTENDED_FIELDS_CONTROLS,
} from '../../../constants';
import { ExternalServiceSchema } from '../external_service/v1';
import { CaseAssigneesSchema, UserSchema } from '../user/v1';
import { CaseConnectorSchema } from '../connector/v1';
import { AttachmentSchemaV2 } from '../attachment/v2';
import { CaseCustomFieldsSchema } from '../custom_field/v1';
import { CaseObservableSchema } from '../observable/v1';
export enum CaseSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export { CaseStatuses };

/**
 * Status — exposed as a TS-enum-typed schema so consumers using
 * `CaseStatuses` (the enum from @kbn/cases-components) get matching
 * type identity instead of a literal-union shape.
 */
export const CaseStatusSchema = z.nativeEnum(CaseStatuses);

export const caseStatuses = Object.values(CaseStatuses);

export const DefaultCloseReasonSchema = z.union([
  z.literal('false_positive'),
  z.literal('duplicate'),
  z.literal('true_positive'),
  z.literal('benign_positive'),
  z.literal('automated_closure'),
  z.literal('other'),
]);

/**
 * Access
 */

export enum CaseAccessMode {
  DEFAULT = 'default',
  RESTRICTED = 'restricted',
}

export const CaseAccessModeSchema = lazySchema(() =>
  z.enum([CaseAccessMode.DEFAULT, CaseAccessMode.RESTRICTED])
);

/**
 * Access control of a case. A `restricted` case is visible only to its
 * assignees (and superusers on stateful deployments). A missing value is
 * treated as `default` everywhere.
 */
export const CaseAccessSchema = lazySchema(() =>
  z.object({
    mode: CaseAccessModeSchema,
  })
);

/**
 * Close reason
 */
export const CaseCloseReasonSchema = z.union([DefaultCloseReasonSchema, z.string()]);

/**
 * Verdicts. `ai_verdict` is what an agent concluded (with its confidence and who set it);
 * `human_verdict` is what the analyst decided, set from the close reason at close and editable.
 */
export const CaseVerdictSchema = lazySchema(() =>
  z.enum(['true_positive', 'false_positive', 'benign_positive', 'suspicious', 'undetermined'])
);

export const CaseAiVerdictSchema = lazySchema(() =>
  z.object({
    verdict: CaseVerdictSchema,
    confidence: z.number().min(0).max(1).nullable().optional(),
    /** The agent's one-paragraph summary behind the verdict, when it gave one. */
    summary: z.string().max(10000).nullable().optional(),
    actor: z
      .object({
        type: z.string(),
        id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        run_id: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    updated_at: z.string().nullable().optional(),
  })
);

/**
 * Where a case came from. Missing on cases created before this field existed.
 */
export const CaseSourceSchema = lazySchema(() =>
  z.enum(['user', 'alertzero', 'rule', 'workflow', 'agent', 'api'])
);

/**
 * Severity — exposed as a TS-enum-typed schema so consumers using
 * `CaseSeverity` get matching type identity instead of a literal union.
 */
export const CaseSeveritySchema = z.nativeEnum(CaseSeverity);

/**
 * Case
 */
export const CaseSettingsSchema = Settings;

export const CaseTemplateSchema = z.object({
  id: z.string(),
  version: z.number(),
});

const CaseBaseFields = {
  /**
   * The description of the case
   */
  description: z.string(),
  /**
   * The identifying strings for filter a case
   */
  tags: z.array(z.string()),
  /**
   * The title of a case
   */
  title: z.string(),
  /**
   * The external system that the case can be synced with
   */
  connector: CaseConnectorSchema,
  /**
   * The severity of the case
   */
  severity: CaseSeveritySchema,
  /**
   * The users assigned to this case
   */
  assignees: CaseAssigneesSchema,
  /**
   * The category of the case.
   */
  category: z.string().nullable(),
  /**
   * An array containing the possible,
   * user-configured custom fields.
   */
  customFields: CaseCustomFieldsSchema,
  /**
   * The alert sync settings
   */
  settings: CaseSettingsSchema,
  /**
   * Observables
   */
  observables: z.array(CaseObservableSchema),
};

export const CaseBaseOptionalFieldsSchema = z.object({
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  title: z.string().optional(),
  connector: CaseConnectorSchema.optional(),
  severity: CaseSeveritySchema.optional(),
  assignees: CaseAssigneesSchema.optional(),
  category: z.string().nullable().optional(),
  customFields: CaseCustomFieldsSchema.optional(),
  settings: CaseSettingsSchema.optional(),
  observables: z.array(CaseObservableSchema).optional(),
});

const CaseBasicSchema = z.object({
  /**
   * The current status of the case (open, closed, in-progress)
   */
  status: CaseStatusSchema,
  /**
   * The plugin owner of the case
   */
  owner: z.string(),
  ...CaseBaseFields,
});

export const CaseAttributesSchema = lazySchema(() =>
  CaseBasicSchema.extend({
    duration: z.number().nullable(),
    closed_at: z.string().nullable(),
    closed_by: UserSchema.nullable(),
    created_at: z.string(),
    created_by: UserSchema,
    external_service: ExternalServiceSchema.nullable(),
    updated_at: z.string().nullable(),
    updated_by: UserSchema.nullable(),
    total_observables: z.number().nullable(),
    incremental_id: z.number().nullable().optional(),
    /**
     * Key of the configured status; null means the category's built-in status
     */
    status_key: z.string().nullable().optional(),
    in_progress_at: z.string().nullable().optional(),
    time_to_acknowledge: z.number().nullable().optional(),
    time_to_investigate: z.number().nullable().optional(),
    time_to_resolve: z.number().nullable().optional(),
    /**
     * Set while the case sits in a status that pauses time tracking
     */
    paused_at: z.string().nullable().optional(),
    /**
     * Seconds spent in pausing statuses, left out of duration and the time-to metrics
     */
    time_paused: z.number().nullable().optional(),
    pause_reason: z.string().nullable().optional(),
    /**
     * The status key the case was paused from; Resume returns it there
     */
    resume_to_status_key: z.string().nullable().optional(),
    template: CaseTemplateSchema.nullable().optional(),
    [CASE_EXTENDED_FIELDS]: z.record(z.string(), z.string()).optional(),
    access: CaseAccessSchema.optional(),
    close_reason: z.string().nullable().optional(),
    human_verdict: CaseVerdictSchema.nullable().optional(),
    ai_verdict: CaseAiVerdictSchema.nullable().optional(),
    source: CaseSourceSchema.nullable().optional(),
    /**
     * The Agent Builder conversation that is the case's room; set the first time the room opens.
     */
    room_conversation_id: z.string().nullable().optional(),
    /**
     * Profile uid of the person who opened the room and owns its conversation. They stay assigned
     * while the room exists, so the case's access never leaves the room's owner outside it.
     */
    room_owner_uid: z.string().nullable().optional(),
    /**
     * Proposals on the case still awaiting a decision. Kept by the plugin that adds the proposals,
     * so the list can filter on cases that need one.
     */
    pending_decisions: z.number().int().min(0).nullable().optional(),
  })
);

export const CaseSchema = CaseAttributesSchema.extend({
  // Populated at response time by enrichCasesWithFieldLabels — not persisted to the SO.
  // Maps storage keys (e.g. `priority_as_keyword`) to user-facing labels (e.g. "Priority").
  [CASE_EXTENDED_FIELDS_LABELS]: z.record(z.string(), z.string()).optional(),
  // Populated alongside extended_fields_labels by enrichCasesWithFieldLabels — not persisted.
  // Maps storage keys to the field's control type (e.g. `USER_PICKER`), so a value that needs
  // parsing (user picker, checkbox group, toggle) can be rendered correctly wherever a case is
  // displayed without threading full field definitions through every consumer.
  [CASE_EXTENDED_FIELDS_CONTROLS]: z.record(z.string(), z.string()).optional(),
  id: z.string(),
  totalComment: z.number(),
  totalAlerts: z.number(),
  totalEvents: z.number().optional(),
  version: z.string(),
  comments: z.array(AttachmentSchemaV2).optional(),
});

export const CasesSchema = z.array(CaseSchema);

export const AttachmentTotalsSchema = z.object({
  alerts: z.number(),
  events: z.number(),
  userComments: z.number(),
});

export const RelatedCaseSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    status: CaseStatusSchema,
    status_key: z.string().nullable().optional(),
    createdAt: z.string(),
    totals: AttachmentTotalsSchema,
  })
);

export const SimilaritySchema = z.object({
  typeKey: z.string(),
  typeLabel: z.string(),
  value: z.string(),
});

export const SimilarCaseSchema = CaseSchema.extend({
  similarities: z.object({ observables: z.array(SimilaritySchema) }),
});

export type Case = z.infer<typeof CaseSchema>;
export type Cases = z.infer<typeof CasesSchema>;
export type CaseAccess = z.infer<typeof CaseAccessSchema>;
export type CaseVerdict = z.infer<typeof CaseVerdictSchema>;
export type CaseAiVerdict = z.infer<typeof CaseAiVerdictSchema>;
export type CaseSource = z.infer<typeof CaseSourceSchema>;
export type CaseAttributes = z.infer<typeof CaseAttributesSchema>;
export type CaseSettings = z.infer<typeof CaseSettingsSchema>;
export type RelatedCase = z.infer<typeof RelatedCaseSchema>;
export type AttachmentTotals = z.infer<typeof AttachmentTotalsSchema>;
export type CaseBaseOptionalFields = z.infer<typeof CaseBaseOptionalFieldsSchema>;
export type SimilarCase = z.infer<typeof SimilarCaseSchema>;
export type SimilarCases = SimilarCase[];
