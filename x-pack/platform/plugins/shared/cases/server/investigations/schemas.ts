/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { INVESTIGATION_LIMITS as L } from '../../common/investigations/constants';
import { PROCEDURE_PHASES, PROPOSAL_CATEGORIES } from '../../common/investigations/types';

/*
 * Request validation for the investigation routes. Every string and array is bounded.
 */

const str = (max: number = L.maxShortTextLength, min = 0) => schema.string({ maxLength: max, minLength: min });
const optStr = (max: number = L.maxShortTextLength) => schema.maybe(schema.nullable(str(max)));
const id = () => str(L.maxIdLength, 1);
const ids = (max: number = L.maxIdsPerArray) => schema.arrayOf(id(), { maxSize: max });
const lits = <T extends string>(values: readonly T[]) =>
  schema.oneOf(values.map((v) => schema.literal(v)) as [Type<T>, ...Array<Type<T>>]);
const pairs = (max = 200) => schema.arrayOf(schema.arrayOf(str(4096), { maxSize: 3 }), { maxSize: max });
const isoDate = () =>
  schema.string({
    maxLength: 64,
    validate: (v) => (Number.isNaN(Date.parse(v)) ? `"${v}" is not a valid date` : undefined),
  });
/** Bounded free-form JSON (arguments, snapshots, before/after values). */
const boundedJson = (maxBytes = 256 * 1024) =>
  schema.any({
    validate: (v) => {
      try {
        return JSON.stringify(v ?? null).length > maxBytes ? `Value is larger than ${maxBytes} bytes` : undefined;
      } catch {
        return 'Value is not serializable';
      }
    },
  });

/** Accept `?x=a&x=b` and `?x=a`. */
const queryArray = <T>(item: Type<T>, max = 50) =>
  schema.maybe(schema.oneOf([schema.arrayOf(item, { maxSize: max }), item]));

export const actorSchema = schema.object({
  type: lits(['user', 'agent', 'automation'] as const),
  id: str(512, 1),
  name: str(512, 1),
  on_behalf_of: optStr(512),
});

const verdictSchema = lits(['true_positive', 'benign', 'inconclusive'] as const);
const prioritySchema = lits(['low', 'medium', 'high', 'critical'] as const);
const fieldsSchema = schema.recordOf(
  schema.string({ maxLength: 128, validate: (k) => (/^[a-z0-9_]+$/i.test(k) ? undefined : `Invalid field key "${k}"`) }),
  schema.nullable(schema.oneOf([str(L.maxShortTextLength), schema.number(), schema.boolean()])),
  { maxSize: L.maxFields }
);
const tagsSchema = schema.arrayOf(str(L.maxTagLength, 1), { maxSize: L.maxTags });
const originSchema = schema.object({
  type: lits(['user', 'rule', 'agent', 'automation'] as const),
  label: str(512, 1),
  actor: schema.maybe(schema.nullable(actorSchema)),
});
const alertRefSchema = schema.object({
  id: id(),
  index: str(512, 1),
  rule_id: optStr(512),
  rule_name: optStr(1024),
});
const activityLinkSchema = schema.object({
  kind: lits(['evidence', 'claim', 'task', 'entity', 'link', 'proposal', 'tab', 'thread', 'verdict', 'record'] as const),
  id: optStr(512),
  label: optStr(512),
});
const itemLinkSchema = schema.object({
  relation: lits(['supports', 'refutes', 'settles', 'about', 'used_in', 'derived_from'] as const),
  target_id: id(),
});

const evidenceTypeSchema = lits([
  'alert', 'event', 'entity', 'indicator', 'query', 'saved_search', 'visualization', 'file', 'note', 'finding', 'conversation',
] as const);
const indicatorTypeSchema = lits(['ip', 'domain', 'url', 'file_hash', 'file_path', 'email', 'registry_key', 'other'] as const);

const evidenceFields = {
  type: evidenceTypeSchema,
  why: optStr(L.maxShortTextLength),
  source: schema.object({
    label: str(256, 1),
    kind: schema.maybe(lits(['alert', 'document', 'saved_search', 'visualization', 'file', 'entity', 'query', 'conversation', 'manual'] as const)),
    index: optStr(512),
    id: optStr(512),
    url: optStr(4096),
    saved_object_id: optStr(512),
    file_id: optStr(512),
    conversation_id: optStr(512),
  }),
  indicator: schema.maybe(schema.nullable(schema.object({ type: indicatorTypeSchema, value: str(2048, 1) }))),
  alert: schema.maybe(
    schema.nullable(
      schema.object({
        id: id(),
        index: str(512, 1),
        rule_id: optStr(512),
        rule_name: optStr(1024),
        severity: optStr(32),
        risk_score: schema.maybe(schema.nullable(schema.number())),
        host: optStr(512),
        user: optStr(512),
        timestamp: schema.maybe(schema.nullable(isoDate())),
      })
    )
  ),
  entity_id: optStr(512),
  snapshot: schema.maybe(schema.nullable(boundedJson(512 * 1024))),
  snapshot_hash: optStr(256),
  preserved_at: schema.maybe(schema.nullable(isoDate())),
  source_expired: schema.maybe(schema.boolean()),
  integrity_note: optStr(L.maxShortTextLength),
};

const claimFields = {
  question: str(L.maxShortTextLength, 1),
  conclusion: optStr(L.maxTextLength),
  note: optStr(L.maxTextLength),
  reasoning: optStr(L.maxTextLength),
  confidence: schema.maybe(schema.nullable(schema.number({ min: 0, max: 100 }))),
  needs_review: schema.boolean({ defaultValue: false }),
  supporting_evidence_ids: schema.arrayOf(id(), { maxSize: 500, defaultValue: [] }),
  opposing_evidence_ids: schema.arrayOf(id(), { maxSize: 500, defaultValue: [] }),
  gaps: schema.arrayOf(str(L.maxShortTextLength), { maxSize: 50, defaultValue: [] }),
  source_message: schema.maybe(
    schema.nullable(
      schema.object({
        conversation_id: id(),
        message_id: optStr(512),
        label: str(256, 1),
        excerpt: optStr(L.maxShortTextLength),
      })
    )
  ),
  stale_reason: optStr(L.maxShortTextLength),
  argument: schema.maybe(schema.nullable(boundedJson())),
};

const entityFields = {
  type: lits(['host', 'user', 'nhi', 'external'] as const),
  name: str(512, 1),
  criticality: optStr(64),
  risk_score: schema.maybe(schema.nullable(schema.number({ min: 0, max: 100 }))),
  risk_level: optStr(64),
  evidence_ids: schema.arrayOf(id(), { maxSize: 500, defaultValue: [] }),
  attributes: schema.maybe(pairs()),
  tags: schema.maybe(schema.arrayOf(str(256), { maxSize: 50 })),
  position: schema.maybe(schema.nullable(schema.object({ x: schema.number(), y: schema.number() }))),
};

const linkFields = {
  from_id: id(),
  to_id: id(),
  kind: lits(['execution', 'ownership', 'authentication', 'network', 'lateral_movement'] as const),
  label: str(512),
  evidence_ids: schema.arrayOf(id(), { maxSize: 500, defaultValue: [] }),
  description: optStr(L.maxShortTextLength),
  claim_id: optStr(512),
};

const taskAutoSchema = schema.oneOf([
  schema.object({ type: schema.literal('claim'), claim_id: optStr(512), question: optStr(L.maxShortTextLength) }),
  schema.object({ type: schema.literal('action'), category: lits(PROPOSAL_CATEGORIES) }),
]);

const taskFields = {
  phase: lits(PROCEDURE_PHASES),
  description: optStr(L.maxShortTextLength),
  required: schema.boolean({ defaultValue: false }),
  owner: schema.object({
    type: lits(['person', 'team', 'agent', 'automation'] as const),
    id: schema.nullable(str(512)),
    name: optStr(512),
  }),
  depends_on: optStr(512),
  auto: schema.maybe(schema.nullable(taskAutoSchema)),
  skip_reason: optStr(L.maxShortTextLength),
  note: optStr(L.maxShortTextLength),
  completed_by: schema.maybe(schema.nullable(actorSchema)),
  completed_at: schema.maybe(schema.nullable(isoDate())),
  template_ref: optStr(256),
  order: schema.number({ min: 0, max: 100000, defaultValue: 0 }),
};

const decisionSchema = schema.object({
  by: schema.maybe(actorSchema),
  at: schema.maybe(isoDate()),
  reason: optStr(512),
  note: optStr(L.maxShortTextLength),
});

const proposalFields = {
  category: lits(PROPOSAL_CATEGORIES),
  effect: str(L.maxShortTextLength),
  disruption: lits(['high', 'medium', 'low'] as const),
  confirm_label: str(128),
  scope: schema.arrayOf(schema.arrayOf(str(1024), { maxSize: 2 }), { maxSize: 50, defaultValue: [] }),
  evidence_ids: schema.arrayOf(id(), { maxSize: 200, defaultValue: [] }),
  revision: schema.number({ min: 1, max: 1000, defaultValue: 1 }),
  decision: schema.maybe(schema.nullable(decisionSchema)),
  argument: schema.maybe(schema.nullable(boundedJson())),
  suggestions: schema.maybe(schema.arrayOf(str(512), { maxSize: 20 })),
  revisions: schema.maybe(boundedJson(64 * 1024)),
};

const timelineFields = {
  occurred_at: isoDate(),
  stage: str(256),
  mitre: optStr(128),
  actor: schema.object({
    name: str(512, 1),
    sub: optStr(512),
    kind: lits(['user', 'nhi', 'proc', 'rule', 'unk'] as const),
  }),
  source: str(256),
  alert_severity: optStr(32),
  flag: schema.maybe(schema.nullable(schema.literal('suspected'))),
  links: schema.arrayOf(activityLinkSchema, { maxSize: 20, defaultValue: [] }),
};

const envelope = {
  title: str(L.maxTitleLength),
  text: optStr(L.maxTextLength),
  links: schema.maybe(schema.arrayOf(itemLinkSchema, { maxSize: 100 })),
  restricted: schema.maybe(schema.boolean()),
  exclude_from_ai: schema.maybe(schema.boolean()),
  created_at: schema.maybe(isoDate()),
};

export const itemInputSchema = schema.oneOf([
  schema.object({ ...envelope, kind: schema.literal('evidence'), status: optStr(64), evidence: schema.object(evidenceFields) }),
  schema.object({ ...envelope, kind: schema.literal('claim'), status: lits(['open', 'supported', 'blocked', 'refuted'] as const), claim: schema.object(claimFields) }),
  schema.object({ ...envelope, kind: schema.literal('entity'), status: lits(['primary', 'scoped', 'suspected', 'dismissed', 'external'] as const), entity: schema.object(entityFields) }),
  schema.object({ ...envelope, kind: schema.literal('link'), status: lits(['confirmed', 'suspected', 'dismissed'] as const), link: schema.object(linkFields) }),
  schema.object({ ...envelope, kind: schema.literal('task'), status: lits(['todo', 'doing', 'done', 'skipped'] as const), task: schema.object(taskFields) }),
  schema.object({
    ...envelope,
    title: schema.maybe(str(L.maxTitleLength)),
    text: str(L.maxTextLength, 1),
    kind: schema.literal('comment'),
    comment: schema.object({ target_id: id(), parent_id: optStr(512) }),
  }),
  schema.object({ ...envelope, kind: schema.literal('proposal'), status: lits(['pending', 'approved', 'rejected', 'withdrawn'] as const), proposal: schema.object(proposalFields) }),
  schema.object({ ...envelope, kind: schema.literal('timeline_event'), status: optStr(64), timeline_event: schema.object(timelineFields) }),
]);

/** Partial per-kind objects: every key optional, same bounds. */
const partial = <P extends Record<string, Type<unknown>>>(props: P) =>
  schema.maybe(
    schema.object(
      Object.fromEntries(Object.entries(props).map(([k, v]) => [k, schema.maybe(v)])) as {
        [K in keyof P]: Type<unknown>;
      }
    )
  );

export const itemPatchSchema = schema.object({
  title: schema.maybe(str(L.maxTitleLength)),
  text: optStr(L.maxTextLength),
  status: optStr(64),
  links: schema.maybe(schema.arrayOf(itemLinkSchema, { maxSize: 100 })),
  restricted: schema.maybe(schema.boolean()),
  exclude_from_ai: schema.maybe(schema.boolean()),
  evidence: partial(evidenceFields),
  claim: partial(claimFields),
  entity: partial(entityFields),
  link: partial(linkFields),
  task: partial(taskFields),
  comment: partial({ target_id: id(), parent_id: optStr(512) }),
  proposal: partial(proposalFields),
  timeline_event: partial(timelineFields),
});

export const recordIdParams = schema.object({ id: id() });
export const recordItemParams = schema.object({ id: id(), item_id: id() });

export const createRecordBody = schema.object({
  title: str(L.maxTitleLength, 1),
  description: str(L.maxTextLength, 1),
  investigation_type: str(256, 1),
  priority: schema.maybe(prioritySchema),
  severity: schema.maybe(prioritySchema),
  tags: schema.maybe(tagsSchema),
  fields: schema.maybe(fieldsSchema),
  summary: optStr(L.maxTextLength),
  origin: schema.maybe(originSchema),
  ai_enabled: schema.maybe(schema.boolean()),
  create_conversation: schema.maybe(schema.boolean()),
  apply_procedure: schema.maybe(schema.boolean()),
  alerts: schema.maybe(schema.arrayOf(alertRefSchema, { maxSize: L.maxBulkItems })),
  display_id: schema.maybe(str(64, 1)),
  restricted_to: schema.maybe(schema.arrayOf(str(512, 1), { maxSize: L.maxRestrictedTo })),
  created_at: schema.maybe(isoDate()),
  actor: schema.maybe(actorSchema),
});

export const findRecordsQuery = schema.object({
  search: schema.maybe(str(L.maxSearchLength)),
  status: queryArray(lits(['open', 'in-progress', 'closed'] as const)),
  priority: queryArray(prioritySchema),
  severity: queryArray(prioritySchema),
  investigation_type: queryArray(str(256)),
  owner: schema.maybe(str(512)),
  verdict: queryArray(verdictSchema),
  tags: queryArray(str(L.maxTagLength)),
  field: queryArray(str(1024)),
  sort_field: schema.maybe(str(256)),
  sort_order: schema.maybe(lits(['asc', 'desc'] as const)),
  page: schema.maybe(schema.number({ min: 1, max: 10000 })),
  per_page: schema.maybe(schema.number({ min: 1, max: L.maxPerPage })),
});

const agentVerdictSchema = schema.object({
  label: str(256, 1),
  confidence: schema.number({ min: 0, max: 100 }),
  classification: verdictSchema,
  alternatives: schema.arrayOf(
    schema.object({
      badge: lits(['Ruled out', 'Weakened', 'Open'] as const),
      headline: str(512),
      text: str(L.maxShortTextLength),
      evidence: schema.arrayOf(str(64), { maxSize: 50 }),
    }),
    { maxSize: 20 }
  ),
  argument: schema.maybe(schema.nullable(boundedJson())),
});

export const updateRecordBody = schema.object({
  title: schema.maybe(str(L.maxTitleLength, 1)),
  description: schema.maybe(str(L.maxTextLength, 1)),
  summary: optStr(L.maxTextLength),
  priority: schema.maybe(prioritySchema),
  priority_note: optStr(512),
  severity: schema.maybe(prioritySchema),
  tags: schema.maybe(tagsSchema),
  fields: schema.maybe(fieldsSchema),
  investigation_type: schema.maybe(str(256, 1)),
  stage: optStr(256),
  owner: schema.maybe(schema.nullable(schema.oneOf([actorSchema, schema.object({ self: schema.literal(true) })]))),
  handoff_note: optStr(L.maxShortTextLength),
  agent_verdict: schema.maybe(schema.nullable(agentVerdictSchema)),
  analyst_verdict: schema.maybe(schema.nullable(schema.object({ verdict: verdictSchema, reason: schema.maybe(str(L.maxShortTextLength)) }))),
  status: schema.maybe(lits(['open', 'in-progress'] as const)),
  restricted_to: schema.maybe(schema.arrayOf(str(512, 1), { maxSize: L.maxRestrictedTo })),
  ai_enabled: schema.maybe(schema.boolean()),
  version: schema.maybe(str(64)),
  actor: schema.maybe(actorSchema),
  ts: schema.maybe(isoDate()),
});

export const closeRecordBody = schema.object({
  verdict: verdictSchema,
  reason: str(256, 1),
  root_cause: str(256, 1),
  summary: str(L.maxTextLength, 1),
  actor: schema.maybe(actorSchema),
  closed_at: schema.maybe(isoDate()),
});

export const mergeRecordBody = schema.object({
  other_id: id(),
  keep: lits(['this', 'other'] as const),
});

export const applyProcedureBody = schema.object({
  type: str(256, 1),
  replace: schema.boolean({ defaultValue: false }),
});

export const sinceQuery = schema.object({ since: schema.maybe(isoDate()) });
export const historyQuery = schema.object({ target_id: schema.maybe(id()) });
export const createThreadBody = schema.object({ title: str(256, 1), anchor: optStr(256) });

export const findItemsQuery = schema.object({
  kind: queryArray(lits(['evidence', 'claim', 'entity', 'link', 'task', 'comment', 'proposal', 'timeline_event'] as const), 10),
  type: queryArray(evidenceTypeSchema, 20),
  indicator_type: queryArray(indicatorTypeSchema, 20),
  added_by: queryArray(str(512), 50),
  added_by_type: queryArray(lits(['user', 'agent', 'automation'] as const), 3),
  status: queryArray(str(64), 20),
  target_id: schema.maybe(id()),
  ids: queryArray(id(), L.maxPerPage),
  refs: queryArray(str(64), L.maxPerPage),
  search: schema.maybe(str(L.maxSearchLength)),
  created_after: schema.maybe(isoDate()),
  sort_field: schema.maybe(lits(['created_at', 'updated_at', 'title', 'ref_num', 'kind', 'evidence.type', 'status'] as const)),
  sort_order: schema.maybe(lits(['asc', 'desc'] as const)),
  page: schema.maybe(schema.number({ min: 1, max: 10000 })),
  per_page: schema.maybe(schema.number({ min: 1, max: L.maxPerPage })),
  cursor: schema.maybe(str(2048)),
  facets: schema.maybe(schema.boolean()),
});

export const exportItemsQuery = findItemsQuery.extends({
  page: undefined,
  per_page: undefined,
  cursor: undefined,
  facets: undefined,
  format: lits(['csv', 'json', 'stix', 'list'] as const),
});

export const bulkCreateItemsBody = schema.object({
  items: schema.arrayOf(itemInputSchema, { minSize: 1, maxSize: L.maxBulkItems }),
  actor: schema.maybe(actorSchema),
  extract_indicators: schema.maybe(schema.boolean()),
  link_alerts: schema.maybe(schema.boolean()),
});

export const updateItemBody = schema.object({
  patch: itemPatchSchema,
  version: str(64, 3),
  actor: schema.maybe(actorSchema),
});

export const bulkUpdateItemsBody = schema.object({
  items: schema.arrayOf(
    schema.object({ id: id(), version: schema.maybe(str(64, 3)), patch: itemPatchSchema }),
    { minSize: 1, maxSize: L.maxBulkItems }
  ),
  actor: schema.maybe(actorSchema),
});

export const bulkDeleteItemsBody = schema.object({ ids: ids(L.maxBulkItems) });
export const preserveBody = schema.object({ ids: ids(L.maxBulkItems) });
export const importBody = schema.object({ csv: str(L.maxImportBytes, 1) });

export const findActivityQuery = schema.object({
  since: schema.maybe(isoDate()),
  search: schema.maybe(str(L.maxSearchLength)),
  actor_type: queryArray(lits(['user', 'agent', 'automation'] as const), 3),
  target_id: schema.maybe(id()),
  action: queryArray(str(128), 20),
  sort_order: schema.maybe(lits(['asc', 'desc'] as const)),
  page: schema.maybe(schema.number({ min: 1, max: 10000 })),
  per_page: schema.maybe(schema.number({ min: 1, max: L.maxPerPage })),
});

export const createActivityBody = schema.object({
  message: str(L.maxShortTextLength, 1),
  details: optStr(L.maxTextLength),
  links: schema.maybe(schema.arrayOf(activityLinkSchema, { maxSize: 20 })),
  action: schema.maybe(str(128, 1)),
  target: schema.maybe(
    schema.nullable(
      schema.object({
        kind: lits(['evidence', 'claim', 'entity', 'link', 'task', 'comment', 'proposal', 'timeline_event', 'record'] as const),
        id: id(),
        ref: optStr(64),
        title: optStr(L.maxTitleLength),
      })
    )
  ),
  actor: schema.maybe(actorSchema),
  ts: schema.maybe(isoDate()),
  before: schema.maybe(boundedJson(64 * 1024)),
  after: schema.maybe(boundedJson(64 * 1024)),
});

export const duplicatesBody = schema.object({
  entity_names: schema.maybe(schema.arrayOf(str(512, 1), { maxSize: 200 })),
  alert_ids: schema.maybe(schema.arrayOf(id(), { maxSize: 1000 })),
  indicator_values: schema.maybe(schema.arrayOf(str(2048, 1), { maxSize: 500 })),
  exclude_record_id: schema.maybe(id()),
});

export const indicatorLookupQuery = schema.object({
  values: schema.oneOf([schema.arrayOf(str(2048, 1), { maxSize: 500 }), str(2048, 1)]),
  exclude_record_id: schema.maybe(id()),
});

export const procedureTemplateParams = schema.object({ type: str(256, 1) });
export const procedureTemplateBody = schema.object({
  tasks: schema.arrayOf(
    schema.object({
      title: str(L.maxTitleLength, 1),
      phase: lits(PROCEDURE_PHASES),
      description: optStr(L.maxShortTextLength),
      required: schema.boolean(),
      owner_type: lits(['person', 'team', 'agent', 'automation'] as const),
      owner: optStr(512),
      auto: schema.maybe(schema.nullable(taskAutoSchema)),
      after: optStr(L.maxTitleLength),
    }),
    { maxSize: 200 }
  ),
});

export const toArray = <T>(v: T | T[] | undefined): T[] | undefined =>
  v === undefined ? undefined : Array.isArray(v) ? v : [v];
