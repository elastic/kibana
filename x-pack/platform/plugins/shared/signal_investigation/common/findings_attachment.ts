/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_INVESTIGATION_FIELD_CHARS,
  investigationSeedSchema,
  type InvestigationSeed,
} from '@kbn/investigation-seed';
import { LEAD_RELATIONSHIPS, type InvestigationLead } from '@kbn/signal-investigation-contract';
import { z, lazySchema } from '@kbn/zod/v4';

export const SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID =
  'platform.signal_investigation.findings' as const;
export const OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID = 'observability.alert' as const;

export const MAX_ATTACHMENT_PLAN_ITEMS = 20;
export const MAX_ATTACHMENT_LEADS = 25;

const boundedFieldSchema = lazySchema(() => z.string().min(1).max(MAX_INVESTIGATION_FIELD_CHARS));

const coverageStatusSchema = lazySchema(() =>
  z.enum([
    'found',
    'no_change',
    'indeterminable',
    'skipped',
    'not_applicable',
    'not_set_up',
    'no_access',
    'running',
  ])
);

export const attachmentPlanItemSchema = lazySchema(() =>
  z.strictObject({
    id: boundedFieldSchema,
    name: boundedFieldSchema,
    technique: boundedFieldSchema,
    status: coverageStatusSchema,
    foundCount: z.number().int().min(0).max(1_000),
    message: z.string().max(MAX_INVESTIGATION_FIELD_CHARS).optional(),
  })
);

export const LEAD_FEEDBACK_VERDICTS = ['useful', 'not_useful'] as const;

export type LeadFeedbackVerdict = (typeof LEAD_FEEDBACK_VERDICTS)[number];

export const attachmentLeadSchema = lazySchema(() =>
  z.strictObject({
    id: boundedFieldSchema,
    analyzerId: boundedFieldSchema,
    summary: boundedFieldSchema,
    occurredAt: z.string().max(MAX_INVESTIGATION_FIELD_CHARS).optional(),
    relevance: boundedFieldSchema,
    ranking: z.strictObject({
      signal: z.enum(['strong', 'moderate', 'weak', 'unknown']),
      timing: z.enum(['before', 'during', 'after', 'unknown']),
      relationship: z.enum(LEAD_RELATIONSHIPS),
    }),
    verdict: z.enum(LEAD_FEEDBACK_VERDICTS).optional(),
  })
);

export const signalInvestigationFindingsAttachmentSchema = lazySchema(() =>
  z.strictObject({
    seed: investigationSeedSchema,
    plan: z.array(attachmentPlanItemSchema).max(MAX_ATTACHMENT_PLAN_ITEMS),
    leads: z.array(attachmentLeadSchema).max(MAX_ATTACHMENT_LEADS),
  })
);

export type SignalInvestigationPlanItem = z.infer<typeof attachmentPlanItemSchema>;
export type SignalInvestigationAttachmentLead = z.infer<typeof attachmentLeadSchema>;
export type SignalInvestigationFindingsAttachmentData = z.infer<
  typeof signalInvestigationFindingsAttachmentSchema
>;

export interface SignalInvestigationChatAttachment {
  id?: string;
  type: string;
  data?: unknown;
}

const boundString = (value: string): string => value.slice(0, MAX_INVESTIGATION_FIELD_CHARS);

/** Builds the bounded findings payload for the Agent Builder attachment. */
export const buildSignalInvestigationFindingsPayload = ({
  seed,
  plan,
  leads,
  feedbackByLead,
}: {
  seed: InvestigationSeed;
  plan: readonly SignalInvestigationPlanItem[];
  leads: readonly InvestigationLead[];
  feedbackByLead?: Readonly<Record<string, LeadFeedbackVerdict | undefined>>;
}): SignalInvestigationFindingsAttachmentData => ({
  seed,
  plan: plan.slice(0, MAX_ATTACHMENT_PLAN_ITEMS).map((item) => ({
    id: boundString(item.id),
    name: boundString(item.name),
    technique: boundString(item.technique),
    status: item.status,
    foundCount: Math.min(Math.max(Math.trunc(item.foundCount), 0), 1_000),
    ...(item.message ? { message: boundString(item.message) } : {}),
  })),
  leads: leads.slice(0, MAX_ATTACHMENT_LEADS).map((lead) => {
    const verdict = feedbackByLead?.[lead.id];
    return {
      id: boundString(lead.id),
      analyzerId: boundString(lead.analyzerId),
      summary: boundString(lead.summary),
      ...(lead.occurredAt ? { occurredAt: boundString(lead.occurredAt) } : {}),
      relevance: boundString(lead.relevance),
      ranking: {
        signal: lead.ranking.signal,
        timing: lead.ranking.timing,
        relationship: lead.ranking.relationship,
      },
      ...(verdict ? { verdict } : {}),
    };
  }),
});

/**
 * Builds the attachments list for `agentBuilder.openChat`, including `observability.alert`
 * when the investigation started from an alert.
 */
export const buildSignalInvestigationChatAttachments = ({
  seed,
  plan,
  leads,
  feedbackByLead,
}: {
  seed: InvestigationSeed;
  plan: readonly SignalInvestigationPlanItem[];
  leads: readonly InvestigationLead[];
  feedbackByLead?: Readonly<Record<string, LeadFeedbackVerdict | undefined>>;
}): SignalInvestigationChatAttachment[] => {
  const findingsPayload = buildSignalInvestigationFindingsPayload({
    seed,
    plan,
    leads,
    feedbackByLead,
  });
  const attachments: SignalInvestigationChatAttachment[] = [];

  if (seed.origin.app === 'alerts') {
    attachments.push({
      id: seed.origin.alertId,
      type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
      data: {
        alertId: seed.origin.alertId,
      },
    });
  }

  attachments.push({
    type: SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID,
    data: findingsPayload,
  });

  return attachments;
};

/** Formats the deterministic investigation findings for the agent context. */
export const formatSignalInvestigationFindingsForAgent = (
  data: SignalInvestigationFindingsAttachmentData
): string => {
  const entityLines = Object.entries(data.seed.entities)
    .filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0
    )
    .map(([field, value]) => `${field}=${value}`);

  const planLines = data.plan.map(
    (item) =>
      `- ${item.technique} (${item.name}): ${item.status} (${item.foundCount} found)${
        item.message ? ` — ${item.message}` : ''
      }`
  );

  const leadLines =
    data.leads.length > 0
      ? data.leads.map(
          (lead, index) =>
            `${index + 1}. [${lead.analyzerId}] ${lead.summary} (${lead.relevance}${
              lead.occurredAt ? `, ${lead.occurredAt}` : ''
            }; signal=${lead.ranking.signal}, timing=${lead.ranking.timing}, relationship=${
              lead.ranking.relationship
            }${lead.verdict ? `, userVerdict=${lead.verdict}` : ''})`
        )
      : ['(no leads found)'];

  return [
    'Deterministic signal investigation findings (statistical observations to verify with tools, not confirmed causes):',
    `Origin: ${data.seed.origin.app}`,
    `Time window: ${data.seed.timeRange.from} to ${data.seed.timeRange.to}`,
    ...(entityLines.length > 0 ? [`Entities: ${entityLines.join(', ')}`] : []),
    'Analysis plan:',
    ...(planLines.length > 0 ? planLines : ['(none)']),
    'Top ranked leads:',
    ...leadLines,
  ].join('\n');
};
