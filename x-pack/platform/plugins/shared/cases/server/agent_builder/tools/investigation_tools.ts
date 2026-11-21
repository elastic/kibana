/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { platformCoreCasesTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { getAgentFromRunContext } from '@kbn/agent-builder-server';
import type { InvestigationsSetup } from '../../investigations';
import type { InvestigationsService } from '../../investigations/service';
import { INVESTIGATION_AGENT_ID } from '../../../common/investigations/types';
import type {
  ClaimItem,
  EntityItem,
  EvidenceItem,
  InvestigationItem,
  ItemInput,
  TaskItem,
} from '../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../common/investigations/constants';

type GetService = InvestigationsSetup['getServiceForRequest'];

const recordIdArg = lazySchema(() =>
  z
    .string()
    .max(512)
    .optional()
    .describe(
      'Investigation record id. Omit it to use the investigation linked to this conversation.'
    )
);

const ok = (data: object) => ({ results: [{ type: 'other' as const, data }] });
const fail = (message: string) => ({ results: [{ type: 'error' as const, data: { message } }] });

const annotations = (title: string, readOnly: boolean) => ({
  title,
  readOnlyHint: readOnly,
  destructiveHint: false,
  idempotentHint: readOnly,
  openWorldHint: false,
});

/** Resolves the acting agent, the service and the record id for a tool call. */
const resolve = async (
  getService: GetService,
  context: ToolHandlerContext,
  recordId?: string
): Promise<{ service: InvestigationsService; recordId: string }> => {
  const agent = getAgentFromRunContext(context.runContext);
  const agentId = agent?.agentId ?? INVESTIGATION_AGENT_ID;
  const service = await getService(context.request, {
    asAgent: {
      id: agentId,
      name:
        agent?.agentName ?? (agentId === INVESTIGATION_AGENT_ID ? 'Investigation agent' : agentId),
    },
  });
  if (recordId) return { service, recordId };
  const conversationId = agent?.conversationId;
  const linked = conversationId ? await service.findRecordIdByConversation(conversationId) : null;
  if (!linked) {
    throw new Error('This conversation is not linked to an investigation. Pass record_id.');
  }
  return { service, recordId: linked };
};

const compact = (item: InvestigationItem) => ({
  id: item.id,
  ref: item.ref,
  kind: item.kind,
  title: item.title.slice(0, 200),
  status: item.status ?? undefined,
  ...(item.kind === 'evidence'
    ? {
        type: (item as EvidenceItem).evidence.type,
        value: (item as EvidenceItem).evidence.indicator?.value,
      }
    : {}),
  ...(item.kind === 'claim'
    ? {
        confidence: (item as ClaimItem).claim.confidence ?? undefined,
        needs_review: (item as ClaimItem).claim.needs_review || undefined,
      }
    : {}),
  ...(item.kind === 'task'
    ? { phase: (item as TaskItem).task.phase, required: (item as TaskItem).task.required }
    : {}),
});

const findByRef = async (
  service: InvestigationsService,
  recordId: string,
  ref: string,
  kind: InvestigationItem['kind']
) => {
  const res = await service.findItemsUnchecked(recordId, {
    refs: [ref],
    kind: [kind],
    per_page: 1,
  });
  return res.items[0];
};

const refsToIds = async (
  service: InvestigationsService,
  recordId: string,
  refs: string[] = []
): Promise<string[]> => {
  if (!refs.length) return [];
  const res = await service.findItemsUnchecked(recordId, {
    refs,
    kind: ['evidence'],
    per_page: Math.min(refs.length, 100),
  });
  return res.items.map((i) => i.id);
};

const guard =
  <A>(fn: (args: A, context: ToolHandlerContext) => Promise<ReturnType<typeof ok>>) =>
  async (args: A, context: ToolHandlerContext) => {
    try {
      return await fn(args, context);
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  };

const readItemsSchema = lazySchema(() =>
  z.object({
    record_id: recordIdArg,
    kind: z
      .enum([
        'evidence',
        'claim',
        'entity',
        'link',
        'task',
        'proposal',
        'comment',
        'timeline_event',
      ])
      .optional(),
    type: z
      .enum([
        'alert',
        'event',
        'entity',
        'indicator',
        'query',
        'saved_search',
        'visualization',
        'file',
        'note',
        'finding',
        'conversation',
      ])
      .optional()
      .describe('Evidence type filter.'),
    status: z.array(z.string().max(32)).max(10).optional(),
    search: z.string().max(512).optional(),
    page: z.number().int().min(1).max(200).optional(),
    per_page: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Items per page (max 50, default 20).'),
  })
);

const addEvidenceSchema = lazySchema(() =>
  z.object({
    record_id: recordIdArg,
    items: z
      .array(
        z.object({
          type: z.enum([
            'indicator',
            'note',
            'query',
            'event',
            'finding',
            'alert',
            'entity',
            'saved_search',
            'visualization',
            'file',
            'conversation',
          ]),
          title: z.string().min(1).max(512),
          why: z.string().max(2048).optional(),
          text: z.string().max(10000).optional(),
          indicator_type: z
            .enum([
              'ip',
              'domain',
              'url',
              'file_hash',
              'file_path',
              'email',
              'registry_key',
              'other',
            ])
            .optional(),
          indicator_value: z.string().max(2048).optional(),
        })
      )
      .min(1)
      .max(INVESTIGATION_LIMITS.maxAgentBulkItems),
  })
);

const upsertClaimSchema = lazySchema(() =>
  z.object({
    record_id: recordIdArg,
    claim_ref: z
      .string()
      .max(32)
      .optional()
      .describe('Existing claim ref such as C3. Omit to open a new claim.'),
    question: z.string().max(2048).optional(),
    status: z.enum(['open', 'supported', 'blocked', 'refuted']).optional(),
    conclusion: z.string().max(10000).optional(),
    reasoning: z.string().max(10000).optional(),
    confidence: z.number().min(0).max(100).optional(),
    note: z.string().max(10000).optional(),
    supporting_evidence_refs: z.array(z.string().max(32)).max(100).optional(),
  })
);

const setTaskStatusSchema = lazySchema(() =>
  z.object({
    record_id: recordIdArg,
    task_ref: z.string().max(32).optional(),
    task_title: z.string().max(512).optional(),
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled']),
    note: z.string().max(2048).optional(),
    cancel_reason: z.string().max(2048).optional().describe('Required when cancelling a task.'),
  })
);

const upsertEntitySchema = lazySchema(() =>
  z.object({
    record_id: recordIdArg,
    entity_ref: z.string().max(32).optional(),
    name: z.string().min(1).max(512),
    type: z.enum(['host', 'user', 'nhi', 'external']),
    scope: z.enum(['primary', 'scoped', 'suspected', 'dismissed', 'external']).optional(),
    criticality: z.string().max(64).optional(),
    risk_score: z.number().min(0).max(100).optional(),
  })
);

const proposeActionSchema = lazySchema(() =>
  z.object({
    record_id: recordIdArg,
    category: z.enum(['Contain', 'Block', 'Escalate', 'Collect evidence', 'Tune detection']),
    title: z.string().min(1).max(512),
    effect: z.string().min(1).max(2048),
    disruption: z.enum(['high', 'medium', 'low']),
    evidence_refs: z.array(z.string().max(32)).max(50).optional(),
    scope: z
      .array(z.object({ key: z.string().max(128), value: z.string().max(1024) }))
      .max(20)
      .optional(),
  })
);

const updateRecordSchema = lazySchema(() =>
  z.object({
    record_id: recordIdArg,
    mode: z
      .enum(['set_fields'])
      .describe(
        'set_fields: set form field values of the investigation type (case extended fields).'
      ),
    fields: z
      .array(
        z.object({
          key: z
            .string()
            .min(1)
            .max(1000)
            .describe('Field key as shown in the digest, e.g. business_unit_as_keyword.'),
          value: z
            .string()
            .max(30000)
            .describe(
              'Value as a string. Numbers as digits, toggles "true"/"false", multi-value fields as a JSON array string. Empty string clears.'
            ),
        })
      )
      .min(1)
      .max(50)
      .optional(),
  })
);

/** Agent Builder tools that read and write an investigation record through the service. */
export const createInvestigationTools = (getService: GetService) => {
  const readItems: BuiltinToolDefinition<typeof readItemsSchema> = {
    id: platformCoreCasesTools.investigationReadItems,
    type: ToolType.builtin,
    description:
      'Read items of an investigation record one page at a time: evidence, claims, scope entities and links, tasks, proposals. Returns compact rows with refs (E12, C3, T5).',
    annotations: annotations('Read investigation items', true),
    schema: readItemsSchema,
    tags: ['cases', 'investigations'],
    handler: guard(async (args, context) => {
      const { service, recordId } = await resolve(getService, context, args.record_id);
      const perPage = args.per_page ?? 20;
      const res = await service.findItems(recordId, {
        kind: args.kind ? [args.kind] : undefined,
        type: args.type ? [args.type] : undefined,
        status: args.status,
        search: args.search,
        page: args.page ?? 1,
        per_page: perPage,
      });
      return ok({
        record_id: recordId,
        total: res.total,
        page: res.page,
        per_page: res.per_page,
        items: res.items.filter((i) => !i.exclude_from_ai && !i.restricted).map(compact),
      });
    }),
  };

  const addEvidence: BuiltinToolDefinition<typeof addEvidenceSchema> = {
    id: platformCoreCasesTools.investigationAddEvidence,
    type: ToolType.builtin,
    description: `Add up to ${INVESTIGATION_LIMITS.maxAgentBulkItems} evidence items (indicators, notes, query results, findings) to the investigation. Each write is attributed to you on behalf of the user and appears in Activity.`,
    annotations: annotations('Add investigation evidence', false),
    schema: addEvidenceSchema,
    tags: ['cases', 'investigations'],
    handler: guard(async (args, context) => {
      const { service, recordId } = await resolve(getService, context, args.record_id);
      const items: ItemInput[] = args.items.map((i) => ({
        kind: 'evidence',
        title: i.title,
        text: i.text ?? null,
        evidence: {
          type: i.type,
          why: i.why ?? null,
          source: { label: 'Agent', kind: 'manual' },
          indicator:
            i.type === 'indicator'
              ? { type: i.indicator_type ?? 'other', value: (i.indicator_value ?? i.title).trim() }
              : null,
          snapshot: i.type === 'note' && i.text ? { kind: 'note', text: i.text } : null,
        },
      }));
      const res = await service.bulkCreateItems(recordId, { items });
      return ok({
        created: res.items.map((i) => ({ id: i.id, ref: i.ref, title: i.title })),
        errors: res.errors,
      });
    }),
  };

  const upsertClaim: BuiltinToolDefinition<typeof upsertClaimSchema> = {
    id: platformCoreCasesTools.investigationUpsertClaim,
    type: ToolType.builtin,
    description:
      'Open a new claim (a question to settle) or update an existing one by ref: status, conclusion, reasoning, confidence and supporting evidence refs. Claims you change are flagged for human review.',
    annotations: annotations('Open or update a claim', false),
    schema: upsertClaimSchema,
    tags: ['cases', 'investigations'],
    handler: guard(async (args, context) => {
      const { service, recordId } = await resolve(getService, context, args.record_id);
      const evidenceIds = await refsToIds(service, recordId, args.supporting_evidence_refs);
      if (args.claim_ref) {
        const existing = (await findByRef(service, recordId, args.claim_ref, 'claim')) as
          | ClaimItem
          | undefined;
        if (!existing) throw new Error(`Claim ${args.claim_ref} not found`);
        const updated = await service.updateItemUnchecked(recordId, existing.id, {
          version: existing.version as string,
          patch: {
            ...(args.status ? { status: args.status } : {}),
            claim: {
              ...(args.question ? { question: args.question } : {}),
              ...(args.conclusion !== undefined ? { conclusion: args.conclusion } : {}),
              ...(args.reasoning !== undefined ? { reasoning: args.reasoning } : {}),
              ...(args.confidence !== undefined ? { confidence: args.confidence } : {}),
              ...(args.note !== undefined ? { note: args.note } : {}),
              ...(evidenceIds.length
                ? {
                    supporting_evidence_ids: Array.from(
                      new Set([...(existing.claim.supporting_evidence_ids ?? []), ...evidenceIds])
                    ),
                  }
                : {}),
              needs_review: true,
            },
          },
        });
        return ok({
          claim: { id: updated.id, ref: updated.ref, title: updated.title, status: updated.status },
        });
      }
      if (!args.question) throw new Error('A question is required to open a claim');
      const res = await service.bulkCreateItems(recordId, {
        items: [
          {
            kind: 'claim',
            title: args.question,
            status: args.status ?? 'open',
            claim: {
              question: args.question,
              conclusion: args.conclusion ?? null,
              reasoning: args.reasoning ?? null,
              confidence: args.confidence ?? null,
              note: args.note ?? null,
              needs_review: true,
              supporting_evidence_ids: evidenceIds,
              opposing_evidence_ids: [],
              gaps: [],
            },
          },
        ],
      });
      const created = res.items[0];
      return ok({
        claim: { id: created.id, ref: created.ref, title: created.title, status: created.status },
      });
    }),
  };

  const setTaskStatus: BuiltinToolDefinition<typeof setTaskStatusSchema> = {
    id: platformCoreCasesTools.investigationSetTaskStatus,
    type: ToolType.builtin,
    description:
      'Set the status of a procedure task by ref (T5) or exact title: open, in_progress, completed or cancelled (cancelled needs a reason).',
    annotations: annotations('Set a task status', false),
    schema: setTaskStatusSchema,
    tags: ['cases', 'investigations'],
    handler: guard(async (args, context) => {
      const { service, recordId } = await resolve(getService, context, args.record_id);
      let task: TaskItem | undefined;
      if (args.task_ref)
        task = (await findByRef(service, recordId, args.task_ref, 'task')) as TaskItem | undefined;
      if (!task && args.task_title) {
        const res = await service.findItemsUnchecked(recordId, {
          kind: ['task'],
          search: args.task_title,
          per_page: 5,
        });
        task =
          (res.items as TaskItem[]).find(
            (t) => t.title.toLowerCase() === args.task_title?.toLowerCase()
          ) ?? (res.items[0] as TaskItem | undefined);
      }
      if (!task) throw new Error('Task not found. Pass task_ref (e.g. T5) or the exact title.');
      const updated = await service.updateItemUnchecked(recordId, task.id, {
        version: task.version as string,
        patch: {
          status: args.status,
          task: {
            ...(args.note ? { note: args.note } : {}),
            ...(args.cancel_reason ? { cancel_reason: args.cancel_reason } : {}),
          },
        },
      });
      return ok({
        task: { id: updated.id, ref: updated.ref, title: updated.title, status: updated.status },
      });
    }),
  };

  const updateRecord: BuiltinToolDefinition<typeof updateRecordSchema> = {
    id: platformCoreCasesTools.investigationUpdateRecord,
    type: ToolType.builtin,
    description:
      'Update the investigation record. Mode set_fields sets form field values by key; the investigation type rules (required, allowed options, patterns, ranges) are enforced and errors name the field.',
    annotations: annotations('Update the investigation', false),
    schema: updateRecordSchema,
    tags: ['cases', 'investigations'],
    handler: guard(async (args, context) => {
      const { service, recordId } = await resolve(getService, context, args.record_id);
      if (!args.fields?.length) throw new Error('Pass fields: [{ key, value }].');
      const record = await service.updateRecord(recordId, {
        extended_fields: Object.fromEntries(args.fields.map(({ key, value }) => [key, value])),
      });
      return ok({
        record: { id: record.id, display_id: record.display_id, fields: record.fields },
      });
    }),
  };

  const upsertEntity: BuiltinToolDefinition<typeof upsertEntitySchema> = {
    id: platformCoreCasesTools.investigationUpsertEntity,
    type: ToolType.builtin,
    description:
      'Add a host, user, non-human identity or external destination to the investigation scope, or change its scope status.',
    annotations: annotations('Add or change a scope entity', false),
    schema: upsertEntitySchema,
    tags: ['cases', 'investigations'],
    handler: guard(async (args, context) => {
      const { service, recordId } = await resolve(getService, context, args.record_id);
      let existing: EntityItem | undefined;
      if (args.entity_ref)
        existing = (await findByRef(service, recordId, args.entity_ref, 'entity')) as
          | EntityItem
          | undefined;
      if (!existing) {
        const res = await service.findItemsUnchecked(recordId, {
          kind: ['entity'],
          search: args.name,
          per_page: 5,
        });
        existing = (res.items as EntityItem[]).find(
          (e) => e.entity.name.toLowerCase() === args.name.toLowerCase()
        );
      }
      if (existing) {
        const updated = await service.updateItemUnchecked(recordId, existing.id, {
          version: existing.version as string,
          patch: {
            ...(args.scope ? { status: args.scope } : {}),
            entity: {
              ...(args.criticality ? { criticality: args.criticality } : {}),
              ...(args.risk_score !== undefined ? { risk_score: args.risk_score } : {}),
            },
          },
        });
        return ok({
          entity: {
            id: updated.id,
            ref: updated.ref,
            title: updated.title,
            status: updated.status,
          },
        });
      }
      const res = await service.bulkCreateItems(recordId, {
        items: [
          {
            kind: 'entity',
            title: args.name,
            status: args.scope ?? (args.type === 'external' ? 'external' : 'suspected'),
            entity: {
              type: args.type,
              name: args.name,
              criticality: args.criticality ?? null,
              risk_score: args.risk_score ?? null,
              evidence_ids: [],
              attributes: [],
              tags: [],
            },
          },
        ],
      });
      const created = res.items[0];
      return ok({
        entity: { id: created.id, ref: created.ref, title: created.title, status: created.status },
      });
    }),
  };

  const proposeAction: BuiltinToolDefinition<typeof proposeActionSchema> = {
    id: platformCoreCasesTools.investigationProposeAction,
    type: ToolType.builtin,
    description:
      'Propose a response action (contain, block, escalate, collect evidence, tune detection) for a person to approve or reject in the Overview. It does not run anything.',
    annotations: annotations('Propose an action', false),
    schema: proposeActionSchema,
    tags: ['cases', 'investigations'],
    handler: guard(async (args, context) => {
      const { service, recordId } = await resolve(getService, context, args.record_id);
      const evidenceIds = await refsToIds(service, recordId, args.evidence_refs);
      const res = await service.bulkCreateItems(recordId, {
        items: [
          {
            kind: 'proposal',
            title: args.title,
            status: 'pending',
            proposal: {
              category: args.category,
              effect: args.effect,
              disruption: args.disruption,
              confirm_label:
                args.category === 'Contain'
                  ? 'Contain'
                  : args.category === 'Block'
                  ? 'Block'
                  : 'Approve',
              scope: (args.scope ?? []).map((s) => [s.key, s.value] as [string, string]),
              evidence_ids: evidenceIds,
              revision: 1,
              decision: null,
            },
          },
        ],
      });
      const created = res.items[0];
      return ok({
        proposal: {
          id: created.id,
          ref: created.ref,
          title: created.title,
          status: created.status,
        },
      });
    }),
  };

  return [
    readItems,
    addEvidence,
    upsertClaim,
    setTaskStatus,
    upsertEntity,
    proposeAction,
    updateRecord,
  ];
};
