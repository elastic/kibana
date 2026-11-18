/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  MAX_ASSIGNEES_PER_CASE,
  MAX_CASES_TO_MERGE,
  MAX_CASE_ID_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_COMMENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_EXTENDED_FIELD_VALUE_BYTES,
  MAX_LENGTH_PER_TAG,
  MAX_MERGE_ATTACHMENT_KEY_LENGTH,
  MAX_MERGE_CHOICE_KEYS,
  MAX_MERGE_EXTENDED_FIELDS,
  MAX_TAGS_PER_CASE,
  MAX_TITLE_LENGTH,
  MIN_CASES_TO_MERGE,
} from '../../../constants';
import { limitedArraySchema, limitedStringSchema } from '../../../schema';
import { CaseConnectorSchema } from '../../domain/connector/v1';
import {
  CaseMergeSchema,
  CaseSeveritySchema,
  CaseStatusSchema,
  CaseTemplateSchema,
} from '../../domain/case/v1';
import { CaseUserProfileSchema } from '../../domain/user/v1';
import { MergeCountsSchema, MergeSourceOutcomeSchema } from '../../domain/user_action/merge/v1';
import { CaseRequestCustomFieldsSchema } from '../case/v1';

const CaseIdSchema = lazySchema(() => z.string().max(MAX_CASE_ID_LENGTH));

const MergeCaseIdsSchema = limitedArraySchema({
  codec: CaseIdSchema,
  fieldName: 'caseIds',
  min: MIN_CASES_TO_MERGE,
  max: MAX_CASES_TO_MERGE,
});

/**
 * Request
 */

/**
 * Values for the destination. Every field is optional: a field left out takes the merge's
 * default, unless the cases hold different values for it, in which case the merge is refused
 * with the list of conflicts.
 */
export const MergeFieldsRequestSchema = lazySchema(() =>
  z.object({
    title: limitedStringSchema({ fieldName: 'title', min: 1, max: MAX_TITLE_LENGTH }).optional(),
    description: limitedStringSchema({
      fieldName: 'description',
      min: 1,
      max: MAX_DESCRIPTION_LENGTH,
    }).optional(),
    severity: CaseSeveritySchema.optional(),
    category: z
      .union([
        limitedStringSchema({ fieldName: 'category', min: 1, max: MAX_CATEGORY_LENGTH }),
        z.null(),
      ])
      .optional(),
    tags: limitedArraySchema({
      codec: limitedStringSchema({ fieldName: 'tag', min: 1, max: MAX_LENGTH_PER_TAG }),
      fieldName: 'tags',
      min: 0,
      max: MAX_TAGS_PER_CASE,
    }).optional(),
    assignees: limitedArraySchema({
      codec: CaseUserProfileSchema,
      fieldName: 'assignees',
      min: 0,
      max: MAX_ASSIGNEES_PER_CASE,
    }).optional(),
    connector: CaseConnectorSchema.optional(),
    /** Legacy custom field values, by key. */
    customFields: CaseRequestCustomFieldsSchema.optional(),
    /** The template to apply at its latest version; `null` means no template. */
    template: z.union([z.object({ id: z.string().max(MAX_TITLE_LENGTH) }), z.null()]).optional(),
    /** Template and global field values by storage key; an empty string clears the field. */
    extendedFields: z
      .record(z.string().max(1000), z.string().max(MAX_EXTENDED_FIELD_VALUE_BYTES))
      .refine((fields) => Object.keys(fields).length <= MAX_MERGE_EXTENDED_FIELDS, {
        message: `The extendedFields field cannot have more than ${MAX_MERGE_EXTENDED_FIELDS} keys.`,
      })
      .optional(),
  })
);

const MergeChoiceKeysSchema = limitedArraySchema({
  codec: limitedStringSchema({ fieldName: 'keys', min: 1, max: MAX_MERGE_ATTACHMENT_KEY_LENGTH }),
  fieldName: 'keys',
  min: 0,
  max: MAX_MERGE_CHOICE_KEYS,
});

const MergeExcludeChoiceSchema = lazySchema(() =>
  z.object({ mode: z.literal('exclude'), keys: MergeChoiceKeysSchema })
);
const MergeKeepChoiceSchema = lazySchema(() =>
  z.object({ mode: z.literal('keep'), keys: MergeChoiceKeysSchema })
);

/**
 * Which items of one kind to copy, as keys from the preview's `choices`: the items to leave out,
 * or the items to keep (whichever list is shorter), or the newest items up to the limit.
 */
export const MergeAttachmentChoiceSchema = lazySchema(() =>
  z.discriminatedUnion('mode', [
    MergeExcludeChoiceSchema,
    MergeKeepChoiceSchema,
    z.object({ mode: z.literal('newest') }),
  ])
);

export const MergeAttachmentsRequestSchema = lazySchema(() =>
  z.object({
    alerts: MergeAttachmentChoiceSchema.optional(),
    events: MergeAttachmentChoiceSchema.optional(),
    /** An attack is kept or left out with the alerts it brought; attacks have no limit. */
    attacks: z
      .discriminatedUnion('mode', [MergeExcludeChoiceSchema, MergeKeepChoiceSchema])
      .optional(),
    observables: MergeAttachmentChoiceSchema.optional(),
    other: MergeAttachmentChoiceSchema.optional(),
  })
);

/** The preview is a dry run of the merge: it takes the same choices and changes nothing. */
export const MergeCasesPreviewRequestSchema = lazySchema(() =>
  z.object({
    caseIds: MergeCaseIdsSchema,
    /**
     * One of `caseIds`, or, on a rerun, the case the first run created. When absent the cases are
     * merged into a new case.
     */
    destinationCaseId: CaseIdSchema.optional(),
    fields: MergeFieldsRequestSchema.optional(),
    attachments: MergeAttachmentsRequestSchema.optional(),
  })
);

export const MergeCasesRequestSchema = lazySchema(() =>
  MergeCasesPreviewRequestSchema.extend({
    /** Close the source cases that are open or in progress. Defaults to true. */
    closeSources: z.boolean().optional(),
    /** Posted as a comment on the destination. */
    note: limitedStringSchema({ fieldName: 'note', min: 1, max: MAX_COMMENT_LENGTH }).optional(),
  })
);

/**
 * Preview response
 */

export const MergePreviewCaseSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    version: z.string(),
    title: z.string(),
    incrementalId: z.number().nullable(),
    status: CaseStatusSchema,
    severity: CaseSeveritySchema,
    owner: z.string(),
    createdAt: z.string(),
    totalAlerts: z.number(),
    template: CaseTemplateSchema.nullable(),
    merge: CaseMergeSchema.nullable(),
  })
);

/**
 * Why a field's suggested value is what it is:
 * - `same`: every case that has a value has this one
 * - `only`: only one case has a value
 * - `destination`: the existing destination's own value
 * - `oldest`: the oldest case's value
 * - `highest`: the highest severity
 * - `mostUsed`: the template most sources use
 * - `templateDefault`: the chosen template's default, because no case has a value
 * - `combined`: values from every case are combined
 * - `none`: no case has a value
 */
export const MergeFieldProvenanceSchema = lazySchema(() =>
  z.enum([
    'same',
    'only',
    'destination',
    'oldest',
    'highest',
    'mostUsed',
    'templateDefault',
    'combined',
    'none',
  ])
);

export const MergeTemplateOptionSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    /** A disabled template cannot be picked. */
    isEnabled: z.boolean(),
  })
);

const CustomFieldValueSchema = lazySchema(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

const mergeSingleValueFieldSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    /** The suggested value. The request's value, when sent, replaces it. */
    value: valueSchema,
    provenance: MergeFieldProvenanceSchema,
    /** The case the suggestion comes from, when it comes from a single case. */
    sourceCaseId: z.string().nullable(),
    /** Every distinct non-empty value with the cases that hold it, in case order. */
    options: z.array(z.object({ value: valueSchema, caseIds: z.array(z.string()) })),
    /** True when two or more cases hold different non-empty values. */
    hasConflict: z.boolean(),
  });

const mergeCombinedFieldSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: z.array(valueSchema),
    provenance: MergeFieldProvenanceSchema,
    max: z.number(),
    /** How many have to be removed to fit `max`. */
    overBy: z.number(),
  });

export const MergeCustomFieldPreviewSchema = lazySchema(() =>
  mergeSingleValueFieldSchema(CustomFieldValueSchema).extend({
    key: z.string(),
    type: z.string(),
    label: z.string(),
    required: z.boolean(),
  })
);

export const MergeExtendedFieldPreviewSchema = lazySchema(() =>
  mergeSingleValueFieldSchema(z.string()).extend({
    /** Storage key, `<name>_as_<type>`. */
    key: z.string(),
    name: z.string(),
    label: z.string(),
    control: z.string(),
    /** Multi-value fields (checkbox groups, multi-user pickers) are combined and never conflict. */
    multiValue: z.boolean(),
    required: z.boolean(),
    /** Global fields apply to every case, whatever its template. */
    isGlobal: z.boolean(),
    /** Why the value is not valid for the chosen template, if it is not. */
    errors: z.array(z.string()),
  })
);

export const MergeConflictSchema = lazySchema(() =>
  z.object({
    field: z.enum([
      'title',
      'description',
      'severity',
      'category',
      'connector',
      'template',
      'customFields',
      'extendedFields',
    ]),
    /** The custom field key or template field storage key. */
    key: z.string().optional(),
    label: z.string().optional(),
    reason: z.enum(['differentValues', 'invalidValue', 'required']),
    message: z.string().optional(),
    /** True when the request sends a value that settles it. */
    resolved: z.boolean(),
  })
);

export const MergeLimitSchema = lazySchema(() =>
  z.object({
    kind: z.enum(['alerts', 'observables', 'other', 'tags', 'assignees', 'description']),
    max: z.number(),
    total: z.number(),
    overBy: z.number(),
  })
);

/** Why the merge leaves an item out on its own, without the user choosing it. */
export const MergeNotCopiedReasonSchema = lazySchema(() =>
  z.enum(['alertCaseLimit', 'alertNotAuthorized', 'license'])
);

export const MergeAttachmentSummarySchema = lazySchema(() =>
  z.object({
    /** Items of this kind across the source cases, duplicates included. */
    total: z.number(),
    /** Items another source or the destination already holds. */
    duplicates: z.number(),
    /** What the destination already holds and counts toward the limit. */
    existing: z.number(),
    /** What the merge copies. */
    toCopy: z.number(),
    /** What the user left out. */
    leftOut: z.number(),
    /** What the merge leaves out on its own, by reason. */
    notCopied: z.array(z.object({ reason: MergeNotCopiedReasonSchema, count: z.number() })),
    max: z.number().nullable(),
    /** How many have to be left out to fit the limit. */
    overBy: z.number(),
  })
);

const mergeChoiceSchema = <T extends z.ZodRawShape>(shape: T) =>
  z.object({
    /** Identifies the item in the request's `attachments`. */
    key: z.string(),
    /** The source case the item is copied from. */
    sourceCaseId: z.string(),
    /** When the item was added to its case. */
    addedAt: z.string(),
    ...shape,
  });

/** Every item the merge would copy, so the user can leave some out. */
export const MergeAttachmentChoicesSchema = lazySchema(() =>
  z.object({
    /** Alerts that no attack brought; an attack's alerts follow the attack. */
    alerts: z.array(
      mergeChoiceSchema({
        alertId: z.string(),
        index: z.string().nullable(),
        ruleId: z.string().nullable(),
        ruleName: z.string().nullable(),
      })
    ),
    events: z.array(mergeChoiceSchema({ eventId: z.string(), index: z.string().nullable() })),
    attacks: z.array(
      mergeChoiceSchema({
        attackId: z.string(),
        title: z.string().nullable(),
        /** Keys of the alerts this attack brings, which are kept or left out with it. */
        alertKeys: z.array(z.string()),
      })
    ),
    observables: z.array(mergeChoiceSchema({ typeKey: z.string(), value: z.string() })),
    other: z.array(
      mergeChoiceSchema({
        type: z.string(),
        /** Persistable state and external references count toward the limit; others don't. */
        countsTowardLimit: z.boolean(),
      })
    ),
  })
);

export const MergeCasesPreviewResponseSchema = lazySchema(() =>
  z.object({
    cases: z.array(MergePreviewCaseSchema),
    destination: z.object({ id: z.string().nullable(), isNew: z.boolean() }),
    fields: z.object({
      title: mergeSingleValueFieldSchema(z.string()),
      description: mergeSingleValueFieldSchema(z.string()).extend({
        /** Every case's description combined, when they differ and fit the limit. */
        combinedValue: z.string().nullable(),
      }),
      severity: mergeSingleValueFieldSchema(CaseSeveritySchema),
      category: mergeSingleValueFieldSchema(z.string().nullable()),
      connector: mergeSingleValueFieldSchema(CaseConnectorSchema),
      template: mergeSingleValueFieldSchema(MergeTemplateOptionSchema.nullable()).extend({
        /** Every template a case uses, with whether it can still be picked. */
        candidates: z.array(MergeTemplateOptionSchema),
      }),
      customFields: z.array(MergeCustomFieldPreviewSchema),
      extendedFields: z.array(MergeExtendedFieldPreviewSchema),
      tags: mergeCombinedFieldSchema(z.string()),
      assignees: mergeCombinedFieldSchema(CaseUserProfileSchema).extend({
        /** False without a Platinum license or the assign privilege; assignees are then not changed. */
        canChange: z.boolean(),
        unavailableReason: z.enum(['license', 'privilege']).nullable(),
      }),
      /** Template fields the sources hold that the destination's template does not define. */
      notCopiedFields: z.array(
        z.object({ key: z.string(), label: z.string(), caseIds: z.array(z.string()) })
      ),
    }),
    /** The template the destination would get: the request's choice, else the suggestion. */
    effectiveTemplate: z
      .object({ id: z.string(), version: z.number(), name: z.string() })
      .nullable(),
    conflicts: z.array(MergeConflictSchema),
    limits: z.array(MergeLimitSchema),
    /** False while a conflict is unresolved or a limit is exceeded. */
    canMerge: z.boolean(),
    attachments: z.object({
      alerts: MergeAttachmentSummarySchema.extend({
        byRule: z.array(
          z.object({
            ruleId: z.string().nullable(),
            ruleName: z.string().nullable(),
            count: z.number(),
          })
        ),
      }),
      events: MergeAttachmentSummarySchema,
      attacks: MergeAttachmentSummarySchema,
      observables: MergeAttachmentSummarySchema,
      other: MergeAttachmentSummarySchema,
      /** Not copied: files stay on their source cases. */
      files: z.object({ total: z.number() }),
      /** Not copied: comments stay on their source cases. */
      comments: z.object({ total: z.number() }),
    }),
    /** Set only when a limit is exceeded. */
    choices: MergeAttachmentChoicesSchema.nullable(),
  })
);

/**
 * Merge response
 */

export const MergeFailureStepSchema = lazySchema(() =>
  z.enum(['copy', 'observables', 'alertLinks', 'mark', 'close', 'activity', 'note'])
);

export const MergeSourceResultSchema = lazySchema(() =>
  z.object({
    caseId: z.string(),
    title: z.string(),
    incrementalId: z.number().nullable(),
    outcome: MergeSourceOutcomeSchema,
    closed: z.boolean(),
    copied: MergeCountsSchema,
    existing: MergeCountsSchema,
    leftOut: MergeCountsSchema,
  })
);

export const MergeCasesResponseSchema = lazySchema(() =>
  z.object({
    destination: z.object({
      id: z.string(),
      title: z.string(),
      /** Set once the numbering task has run. */
      incrementalId: z.number().nullable(),
      isNew: z.boolean(),
    }),
    /** One result per source case. A merge that leaves a source not merged still succeeds. */
    sources: z.array(MergeSourceResultSchema),
    /** Steps that failed after the destination existed. Nothing is rolled back. */
    failures: z.array(
      z.object({
        step: MergeFailureStepSchema,
        caseId: z.string().nullable(),
        reason: z.string(),
      })
    ),
  })
);

export type MergeFieldsRequest = z.infer<typeof MergeFieldsRequestSchema>;
export type MergeAttachmentChoice = z.infer<typeof MergeAttachmentChoiceSchema>;
export type MergeAttachmentsRequest = z.infer<typeof MergeAttachmentsRequestSchema>;
export type MergeCasesPreviewRequest = z.infer<typeof MergeCasesPreviewRequestSchema>;
export type MergeCasesRequest = z.infer<typeof MergeCasesRequestSchema>;
export type MergePreviewCase = z.infer<typeof MergePreviewCaseSchema>;
export type MergeFieldProvenance = z.infer<typeof MergeFieldProvenanceSchema>;
export type MergeTemplateOption = z.infer<typeof MergeTemplateOptionSchema>;
export type MergeCustomFieldPreview = z.infer<typeof MergeCustomFieldPreviewSchema>;
export type MergeExtendedFieldPreview = z.infer<typeof MergeExtendedFieldPreviewSchema>;
export type MergeConflict = z.infer<typeof MergeConflictSchema>;
export type MergeLimit = z.infer<typeof MergeLimitSchema>;
export type MergeNotCopiedReason = z.infer<typeof MergeNotCopiedReasonSchema>;
export type MergeAttachmentSummary = z.infer<typeof MergeAttachmentSummarySchema>;
export type MergeAttachmentChoices = z.infer<typeof MergeAttachmentChoicesSchema>;
export type MergeCasesPreviewResponse = z.infer<typeof MergeCasesPreviewResponseSchema>;
export type MergeFailureStep = z.infer<typeof MergeFailureStepSchema>;
export type MergeSourceResult = z.infer<typeof MergeSourceResultSchema>;
export type MergeCasesResponse = z.infer<typeof MergeCasesResponseSchema>;
