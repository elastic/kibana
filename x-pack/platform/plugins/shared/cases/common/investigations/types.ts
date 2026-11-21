/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Shared contract for the Unified Investigation View POC. Server, browser, agent tools and
 * scripts all code against these shapes. Field names are snake_case because they are stored
 * as-is in Elasticsearch and returned as-is by the internal API.
 */

/* ------------------------------------------------------------------ */
/* Actors                                                              */
/* ------------------------------------------------------------------ */

export type ActorType = 'user' | 'agent' | 'automation';

export interface Actor {
  type: ActorType;
  /** Username for users, agent id for agents, workflow/automation id for automation. */
  id: string;
  /** Display name, e.g. "Priya K.", "Hunt worker", "Workflow". */
  name: string;
  /** Set when an agent or automation acted for a person (their display name). */
  on_behalf_of?: string | null;
}

/* ------------------------------------------------------------------ */
/* Enumerations                                                        */
/* ------------------------------------------------------------------ */

/** Mirrors the case status. The UI shows `open` without an owner as "Needs owner". */
export type InvestigationStatus = 'open' | 'in-progress' | 'closed';
export type InvestigationPriority = 'low' | 'medium' | 'high' | 'critical';
export type InvestigationSeverity = 'low' | 'medium' | 'high' | 'critical';
export type Verdict = 'true_positive' | 'benign' | 'inconclusive';
export const VERDICT_LABELS: Record<Verdict, string> = {
  true_positive: 'True positive',
  benign: 'Benign',
  inconclusive: 'Inconclusive',
};

export type ItemKind =
  | 'evidence'
  | 'claim'
  | 'entity'
  | 'link'
  | 'task'
  | 'comment'
  | 'proposal'
  | 'timeline_event';

export type EvidenceType =
  | 'alert'
  | 'event'
  | 'entity'
  | 'indicator'
  | 'query'
  | 'saved_search'
  | 'visualization'
  | 'file'
  | 'note'
  | 'finding'
  | 'conversation';
export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  alert: 'Alert',
  event: 'Event',
  entity: 'Entity',
  indicator: 'Indicator',
  query: 'Query',
  saved_search: 'Saved search',
  visualization: 'Visualization',
  file: 'File',
  note: 'Note',
  finding: 'Check',
  conversation: 'Conversation',
};
/** The eight kinds offered by the "Add evidence" flow, in prototype order. */
export const ADDABLE_EVIDENCE_TYPES: readonly EvidenceType[] = [
  'saved_search',
  'entity',
  'indicator',
  'alert',
  'query',
  'visualization',
  'file',
  'note',
] as const;

export type IndicatorType =
  | 'ip'
  | 'domain'
  | 'url'
  | 'file_hash'
  | 'file_path'
  | 'email'
  | 'registry_key'
  | 'other';
export const INDICATOR_TYPE_LABELS: Record<IndicatorType, string> = {
  ip: 'IP address',
  domain: 'Domain',
  url: 'URL',
  file_hash: 'File hash',
  file_path: 'File path',
  email: 'Email address',
  registry_key: 'Registry key',
  other: 'Other',
};

export type ClaimStatus = 'open' | 'supported' | 'blocked' | 'refuted';
export type EntityType = 'host' | 'user' | 'nhi' | 'external';
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  host: 'Host',
  user: 'User',
  nhi: 'Non-human identity',
  external: 'External destination',
};
/** Scope status of an entity (stored in the item envelope `status`). */
export type EntityScope = 'primary' | 'scoped' | 'suspected' | 'dismissed' | 'external';
export type LinkKind = 'execution' | 'ownership' | 'authentication' | 'network' | 'lateral_movement';
export const LINK_KIND_LABELS: Record<LinkKind, string> = {
  execution: 'Execution',
  ownership: 'Ownership',
  authentication: 'Authentication',
  network: 'Network',
  lateral_movement: 'Lateral movement',
};
export type LinkStatus = 'confirmed' | 'suspected' | 'dismissed';
export type TaskStatus = 'todo' | 'doing' | 'done' | 'skipped';
export type TaskOwnerType = 'person' | 'team' | 'agent' | 'automation';
export const PROCEDURE_PHASES = [
  'Triage',
  'Investigate',
  'Contain',
  'Eradicate and recover',
  'Close out',
] as const;
export type ProcedurePhase = (typeof PROCEDURE_PHASES)[number];
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';
export const PROPOSAL_CATEGORIES = [
  'Contain',
  'Block',
  'Escalate',
  'Collect evidence',
  'Tune detection',
] as const;
export type ProposalCategory = (typeof PROPOSAL_CATEGORIES)[number];
export type Disruption = 'high' | 'medium' | 'low';
export const CLOSE_REASONS = [
  'Resolved and remediated',
  'Contained, monitoring',
  'False positive',
  'Duplicate',
  'Not enough data',
  'Authorized activity',
] as const;
export const ROOT_CAUSES = [
  'Malicious code executed through a signed binary',
  'Phishing email',
  'Compromised credentials',
  'Authorized activity',
  'Misconfiguration',
  'Unknown',
] as const;

/* ------------------------------------------------------------------ */
/* Argument (chain / map / balance views)                              */
/* ------------------------------------------------------------------ */

export type ArgumentStrength =
  | 'Strong'
  | 'Moderate'
  | 'Incomplete'
  | 'Unreviewed'
  | 'Blocked'
  | 'Unsupported'
  | 'Refuted';

/** Evidence references inside an argument are item `ref`s (E1, E12). */
export interface Argument {
  kind: 'Verdict' | 'Claim' | 'Proposed action';
  by: string;
  when: string;
  strength: ArgumentStrength;
  confidence: number | null;
  claim: string;
  condition: string;
  grounds: Array<{ text: string; evidence: string[]; source: string; weight: 1 | 2 | 3 }>;
  steps: Array<{ text: string; evidence: string[]; source: string; so: string }>;
  warrant: { rule: string; backing: string } | null;
  rebuttals: Array<{
    text: string;
    status: 'rejected' | 'weakened' | 'open';
    response: string;
    evidence: string[];
  }>;
  against: Array<{ text: string; evidence: string[]; weight: 1 | 2 | 3 }>;
  gaps: Array<{ text: string; why: string; evidence: string[]; weight: 1 | 2 | 3 }>;
  changes: string;
}

/* ------------------------------------------------------------------ */
/* Record                                                              */
/* ------------------------------------------------------------------ */

/**
 * Typed form field values. Keys carry a type suffix so the index maps them through dynamic
 * templates: `_keyword`, `_text`, `_long`, `_double`, `_date`, `_bool`.
 * Example: { business_unit_keyword: 'Engineering', impact_keyword: '1 host, 1 user' }.
 */
export type FieldValue = string | number | boolean | null;
export type RecordFields = Record<string, FieldValue>;

export interface AgentVerdictAlternative {
  badge: 'Ruled out' | 'Weakened' | 'Open';
  headline: string;
  text: string;
  /** Item refs. */
  evidence: string[];
}

export interface AgentVerdict {
  label: string;
  confidence: number;
  classification: Verdict;
  alternatives: AgentVerdictAlternative[];
  argument?: Argument | null;
  set_by: Actor;
  set_at: string;
}

export interface AnalystVerdict {
  verdict: Verdict;
  reason?: string;
  set_by: Actor;
  set_at: string;
}

export interface CloseOutcome {
  verdict: Verdict;
  reason: string;
  root_cause: string;
  summary: string;
  closed_by: Actor;
  closed_at: string;
  alerts_closed: number;
  proposals_withdrawn: number;
}

export interface RecordOrigin {
  type: 'user' | 'rule' | 'agent' | 'automation';
  /** e.g. "Started by Hunt worker from 2 alerts". */
  label: string;
  actor?: Actor | null;
}

export interface ThreadRef {
  conversation_id: string;
  title: string;
  created_at: string;
  created_by: Actor;
  /** Optional anchor, e.g. "Message 9". */
  anchor?: string | null;
}

export interface RecordCounters {
  evidence: number;
  evidence_by_type: Partial<Record<EvidenceType, number>>;
  alerts: number;
  indicators: number;
  claims: number;
  claims_by_status: Partial<Record<ClaimStatus, number>>;
  claims_needs_review: number;
  entities: number;
  entities_by_type: Partial<Record<EntityType, number>>;
  /** Entities not dismissed, not suspected and not external. */
  entities_in_scope: number;
  entities_suspected: number;
  links: number;
  tasks: number;
  tasks_done: number;
  tasks_skipped: number;
  required_tasks_left: number;
  proposals: number;
  proposals_pending: number;
  proposals_pending_disruptive: number;
  comments: number;
  timeline_events: number;
  activity: number;
}

export interface InvestigationRecord {
  /** Equal to the case id. */
  id: string;
  case_id: string;
  space_id: string;
  /** Human id, e.g. "INV-218". */
  display_id: string;
  display_num: number;
  title: string;
  description: string;
  status: InvestigationStatus;
  severity: InvestigationSeverity;
  priority: InvestigationPriority;
  priority_note?: string | null;
  tags: string[];
  /** Case assignees (user profile uids). */
  assignees: string[];
  /** Investigation owner (a person or agent), null when nobody owns it. */
  owner: Actor | null;
  participants: Actor[];
  created_at: string;
  created_by: Actor;
  updated_at: string;
  updated_by: Actor;
  closed_at?: string | null;
  investigation_type: string;
  template_id?: string | null;
  stage?: string | null;
  /** Short plain-language summary of the record ("What this is"). */
  summary?: string | null;
  fields: RecordFields;
  agent_verdict?: AgentVerdict | null;
  analyst_verdict?: AnalystVerdict | null;
  close_outcome?: CloseOutcome | null;
  origin: RecordOrigin;
  /** The main Agent Builder conversation. */
  conversation_id?: string | null;
  /** Every linked conversation id, main first. */
  conversation_ids: string[];
  threads: ThreadRef[];
  /** False for teams that do not use agents (scenario C). */
  ai_enabled: boolean;
  agent_id?: string | null;
  agent_name?: string | null;
  /** When non-empty, only these usernames may read the record through investigation routes. */
  restricted_to: string[];
  counters: RecordCounters;
  last_handoff?: { at: string; by: Actor; to?: Actor | null; note?: string | null } | null;
  merged_into?: string | null;
  merged_from: string[];
  /** "seq_no:primary_term" of the record document; returned on read. */
  version?: string;
}

/* ------------------------------------------------------------------ */
/* Items                                                               */
/* ------------------------------------------------------------------ */

export interface ItemLink {
  relation: 'supports' | 'refutes' | 'settles' | 'about' | 'used_in' | 'derived_from';
  target_id: string;
}

export type EvidenceSnapshot =
  | {
      kind: 'alert';
      severity: string;
      risk_score: number;
      timestamp: string;
      rule: string;
      description: string;
      reason: string;
      mitre: Array<[string, string]>;
      fields: Array<[string, string]>;
    }
  | { kind: 'entity'; attributes: Array<[string, string]>; contributions?: Array<[string, string]> }
  | {
      kind: 'indicator';
      facts: Array<[string, string]>;
      intel: Array<[string, string]>;
      seen: Array<[string, string]>;
    }
  | { kind: 'query'; query: string; columns: string[]; rows: string[][]; meta: string; note?: string }
  | { kind: 'finding'; text: string; steps: Array<[string, string, string]> }
  | { kind: 'event'; category: string; timestamp: string; fields: Array<[string, string]> }
  | { kind: 'file'; name: string; size: string; sha256: string; mime_type?: string }
  | { kind: 'note'; text: string }
  | {
      kind: 'saved_search';
      name: string;
      summary: string;
      columns: string[];
      rows: string[][];
    }
  | { kind: 'visualization'; name: string; app: string; description?: string }
  | { kind: 'conversation'; conversation_id: string; message: string; author: string };

export interface EvidenceSource {
  /** Short human label, e.g. "Detection rule", "Entity store", "ES|QL query". */
  label: string;
  kind?:
    | 'alert'
    | 'document'
    | 'saved_search'
    | 'visualization'
    | 'file'
    | 'entity'
    | 'query'
    | 'conversation'
    | 'manual';
  index?: string | null;
  id?: string | null;
  url?: string | null;
  saved_object_id?: string | null;
  file_id?: string | null;
  conversation_id?: string | null;
}

export interface EvidenceDetails {
  type: EvidenceType;
  why?: string | null;
  source: EvidenceSource;
  indicator?: { type: IndicatorType; value: string } | null;
  alert?: {
    id: string;
    index: string;
    rule_id?: string | null;
    rule_name?: string | null;
    severity?: string | null;
    risk_score?: number | null;
    host?: string | null;
    user?: string | null;
    timestamp?: string | null;
  } | null;
  /** Entity item id this evidence describes, if any. */
  entity_id?: string | null;
  snapshot?: EvidenceSnapshot | null;
  snapshot_hash?: string | null;
  preserved_at?: string | null;
  source_expired?: boolean;
  integrity_note?: string | null;
}

export interface ClaimDetails {
  question: string;
  conclusion?: string | null;
  /** Why it is open or blocked. */
  note?: string | null;
  reasoning?: string | null;
  confidence?: number | null;
  needs_review: boolean;
  /** Evidence item ids. */
  supporting_evidence_ids: string[];
  opposing_evidence_ids: string[];
  gaps: string[];
  source_message?: {
    conversation_id: string;
    message_id?: string | null;
    label: string;
    excerpt?: string | null;
  } | null;
  /** Set when evidence arrived after the conclusion, e.g. "3 new evidence items arrived". */
  stale_reason?: string | null;
  argument?: Argument | null;
}

export interface EntityDetails {
  type: EntityType;
  name: string;
  criticality?: string | null;
  risk_score?: number | null;
  risk_level?: string | null;
  evidence_ids: string[];
  attributes: Array<[string, string]>;
  tags: string[];
  position?: { x: number; y: number } | null;
}

export interface LinkDetails {
  from_id: string;
  to_id: string;
  kind: LinkKind;
  label: string;
  evidence_ids: string[];
  description?: string | null;
  claim_id?: string | null;
}

export type TaskAutoRule =
  | { type: 'claim'; claim_id?: string | null; question?: string | null }
  | { type: 'action'; category: ProposalCategory };

export interface TaskDetails {
  phase: ProcedurePhase;
  description?: string | null;
  required: boolean;
  owner: { type: TaskOwnerType; id: string | null; name?: string | null };
  depends_on?: string | null;
  auto?: TaskAutoRule | null;
  skip_reason?: string | null;
  note?: string | null;
  completed_by?: Actor | null;
  completed_at?: string | null;
  template_ref?: string | null;
  order: number;
}

export interface ProposalDetails {
  category: ProposalCategory;
  effect: string;
  disruption: Disruption;
  confirm_label: string;
  scope: Array<[string, string]>;
  evidence_ids: string[];
  revision: number;
  decision?: {
    by: Actor;
    at: string;
    reason?: string | null;
    note?: string | null;
  } | null;
  argument?: Argument | null;
  suggestions?: string[];
  revisions?: Array<{ at: string; by: Actor; title: string; request?: string | null }>;
}

export interface CommentDetails {
  /** Item id, or the record id for record-level discussion. */
  target_id: string;
  /** Thread parent comment id for replies. */
  parent_id?: string | null;
}

export interface TimelineEventDetails {
  occurred_at: string;
  stage: string;
  mitre?: string | null;
  actor: { name: string; sub?: string | null; kind: 'user' | 'nhi' | 'proc' | 'rule' | 'unk' };
  source: string;
  alert_severity?: string | null;
  flag?: 'suspected' | null;
  links: ActivityLink[];
}

export interface ItemEnvelope {
  id: string;
  record_id: string;
  space_id: string;
  kind: ItemKind;
  /** Display reference unique per record and kind, e.g. "E12". */
  ref: string;
  created_at: string;
  created_by: Actor;
  updated_at: string;
  updated_by: Actor;
  title: string;
  /** Markdown body (notes, comments, descriptions). */
  text?: string | null;
  status?: string | null;
  links: ItemLink[];
  restricted?: boolean;
  exclude_from_ai?: boolean;
  /** "seq_no:primary_term"; returned on read, required for conflict-checked updates. */
  version?: string;
}

export type EvidenceItem = ItemEnvelope & { kind: 'evidence'; evidence: EvidenceDetails };
export type ClaimItem = ItemEnvelope & { kind: 'claim'; status: ClaimStatus; claim: ClaimDetails };
export type EntityItem = ItemEnvelope & { kind: 'entity'; status: EntityScope; entity: EntityDetails };
export type LinkItem = ItemEnvelope & { kind: 'link'; status: LinkStatus; link: LinkDetails };
export type TaskItem = ItemEnvelope & { kind: 'task'; status: TaskStatus; task: TaskDetails };
export type CommentItem = ItemEnvelope & { kind: 'comment'; comment: CommentDetails };
export type ProposalItem = ItemEnvelope & {
  kind: 'proposal';
  status: ProposalStatus;
  proposal: ProposalDetails;
};
export type TimelineEventItem = ItemEnvelope & {
  kind: 'timeline_event';
  timeline_event: TimelineEventDetails;
};

export type InvestigationItem =
  | EvidenceItem
  | ClaimItem
  | EntityItem
  | LinkItem
  | TaskItem
  | CommentItem
  | ProposalItem
  | TimelineEventItem;

/** Input for creating an item: the server fills id, ref, record/space ids, actors and times. */
export type ItemInput =
  | { kind: 'evidence'; title: string; text?: string | null; status?: string | null; links?: ItemLink[]; restricted?: boolean; exclude_from_ai?: boolean; evidence: EvidenceDetails; created_at?: string }
  | { kind: 'claim'; title: string; text?: string | null; status: ClaimStatus; links?: ItemLink[]; claim: ClaimDetails; created_at?: string }
  | { kind: 'entity'; title: string; text?: string | null; status: EntityScope; links?: ItemLink[]; entity: EntityDetails; created_at?: string }
  | { kind: 'link'; title: string; text?: string | null; status: LinkStatus; links?: ItemLink[]; link: LinkDetails; created_at?: string }
  | { kind: 'task'; title: string; text?: string | null; status: TaskStatus; links?: ItemLink[]; task: TaskDetails; created_at?: string }
  | { kind: 'comment'; title?: string; text: string; links?: ItemLink[]; comment: CommentDetails; created_at?: string }
  | { kind: 'proposal'; title: string; text?: string | null; status: ProposalStatus; links?: ItemLink[]; proposal: ProposalDetails; created_at?: string }
  | { kind: 'timeline_event'; title: string; text?: string | null; status?: string | null; links?: ItemLink[]; timeline_event: TimelineEventDetails; created_at?: string };

/**
 * Partial update of an item. Per-kind objects are shallow-merged into the stored object, so a
 * patch of `{ claim: { needs_review: false } }` only changes that key.
 */
export interface ItemPatch {
  title?: string;
  text?: string | null;
  status?: string | null;
  links?: ItemLink[];
  restricted?: boolean;
  exclude_from_ai?: boolean;
  evidence?: Partial<EvidenceDetails>;
  claim?: Partial<ClaimDetails>;
  entity?: Partial<EntityDetails>;
  link?: Partial<LinkDetails>;
  task?: Partial<TaskDetails>;
  comment?: Partial<CommentDetails>;
  proposal?: Partial<ProposalDetails>;
  timeline_event?: Partial<TimelineEventDetails>;
}

/* ------------------------------------------------------------------ */
/* Activity                                                            */
/* ------------------------------------------------------------------ */

export interface ActivityLink {
  kind: 'evidence' | 'claim' | 'task' | 'entity' | 'link' | 'proposal' | 'tab' | 'thread' | 'verdict' | 'record';
  /** Item id, conversation id, tab name or record id. */
  id?: string | null;
  label?: string | null;
}

export interface ActivityEntry {
  id: string;
  record_id: string;
  space_id: string;
  ts: string;
  actor: Actor;
  /** Dotted action, e.g. "record.created", "item.created", "claim.status_changed", "note". */
  action: string;
  target?: { kind: ItemKind | 'record'; id: string; ref?: string | null; title?: string | null } | null;
  /** One-line summary shown in the response log. */
  message: string;
  details?: string | null;
  links: ActivityLink[];
  /** Stored, not indexed. Used by change history. */
  before?: unknown;
  after?: unknown;
}

/* ------------------------------------------------------------------ */
/* Procedure templates                                                 */
/* ------------------------------------------------------------------ */

export interface ProcedureTemplateTask {
  title: string;
  phase: ProcedurePhase;
  description?: string | null;
  required: boolean;
  owner_type: TaskOwnerType;
  owner?: string | null;
  auto?: TaskAutoRule | null;
  /** Title of the task this one depends on. */
  after?: string | null;
}

export interface ProcedureTemplate {
  /** Investigation type name, e.g. "Malware". */
  type: string;
  tasks: ProcedureTemplateTask[];
  updated_at: string;
  updated_by: Actor;
  version?: string;
}

export interface InvestigationType {
  name: string;
  /** Cases template id, when one exists. */
  template_id: string | null;
  description?: string | null;
  fields: Array<{ key: string; label: string; type: 'keyword' | 'text' | 'long' | 'double' | 'date' | 'bool'; options?: string[] }>;
}

/* ------------------------------------------------------------------ */
/* API request and response shapes                                     */
/* ------------------------------------------------------------------ */

export interface AlertRefInput {
  id: string;
  index: string;
  rule_id?: string | null;
  rule_name?: string | null;
}

export interface CreateRecordRequest {
  title: string;
  description: string;
  investigation_type: string;
  priority?: InvestigationPriority;
  severity?: InvestigationSeverity;
  tags?: string[];
  fields?: RecordFields;
  summary?: string | null;
  origin?: RecordOrigin;
  ai_enabled?: boolean;
  /** Create the main Agent Builder conversation. Defaults to `ai_enabled`. */
  create_conversation?: boolean;
  /** Apply the procedure template for the investigation type. Default true. */
  apply_procedure?: boolean;
  alerts?: AlertRefInput[];
  display_id?: string;
  restricted_to?: string[];
  /** Honoured only when `xpack.cases.investigations.allowBackdate` is true (seeding). */
  created_at?: string;
  actor?: Actor;
}

export interface CreateRecordResponse {
  record: InvestigationRecord;
}

export interface FindRecordsRequest {
  search?: string;
  status?: InvestigationStatus[];
  priority?: InvestigationPriority[];
  severity?: InvestigationSeverity[];
  investigation_type?: string[];
  owner?: string;
  /** 'unassigned' matches records with no owner. */
  verdict?: Verdict[];
  tags?: string[];
  /** Typed form field filters, "key:value" with the suffixed key. */
  field?: string[];
  sort_field?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface FindRecordsResponse {
  records: InvestigationRecord[];
  total: number;
  page: number;
  per_page: number;
  took_ms: number;
}

export interface GetRecordResponse {
  record: InvestigationRecord;
  /** Fresh copy of the case fields the header needs. */
  case: {
    id: string;
    version: string;
    status: InvestigationStatus;
    title: string;
    description: string;
    severity: InvestigationSeverity;
    tags: string[];
    assignees: Array<{ uid: string }>;
    created_at: string;
    updated_at: string | null;
    created_by: { username?: string | null; full_name?: string | null };
  };
  /** Whether the current user may use the agent on this record. */
  agent_available: boolean;
}

export interface UpdateRecordRequest {
  title?: string;
  description?: string;
  summary?: string | null;
  priority?: InvestigationPriority;
  priority_note?: string | null;
  severity?: InvestigationSeverity;
  tags?: string[];
  fields?: RecordFields;
  investigation_type?: string;
  stage?: string | null;
  /** Set to an actor to assign, null to unassign. `{ self: true }` assigns the caller. */
  owner?: Actor | null | { self: true };
  handoff_note?: string | null;
  agent_verdict?: Omit<AgentVerdict, 'set_by' | 'set_at'> | null;
  /** null reverts to the agent verdict. */
  analyst_verdict?: Omit<AnalystVerdict, 'set_by' | 'set_at'> | null;
  status?: 'open' | 'in-progress';
  restricted_to?: string[];
  ai_enabled?: boolean;
  /** Optimistic concurrency on the record document ("seq_no:primary_term"). */
  version?: string;
  actor?: Actor;
  /** Honoured only when `allowBackdate` is on (seeding historical changes). */
  ts?: string;
}

export interface CloseRecordRequest {
  verdict: Verdict;
  reason: string;
  root_cause: string;
  summary: string;
  actor?: Actor;
  closed_at?: string;
}

export interface MergeRecordRequest {
  other_id: string;
  /** Which record stays open. */
  keep: 'this' | 'other';
}

export interface MergeRecordResponse {
  primary: InvestigationRecord;
  merged: InvestigationRecord;
  items_moved: number;
}

export interface FindItemsRequest {
  kind?: ItemKind[];
  /** Evidence types. */
  type?: EvidenceType[];
  indicator_type?: IndicatorType[];
  /** Actor ids (usernames / agent ids). */
  added_by?: string[];
  added_by_type?: ActorType[];
  status?: string[];
  /** Comments for an item. */
  target_id?: string;
  ids?: string[];
  refs?: string[];
  search?: string;
  /** Only items created after this time (e.g. "since the last handoff"). */
  created_after?: string;
  sort_field?: 'created_at' | 'updated_at' | 'title' | 'ref_num' | 'kind' | 'evidence.type' | 'status' | 'created_by';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  /** Opaque search_after cursor for deep paging; overrides `page`. */
  cursor?: string;
  /** Include facet counts for the filter bar. */
  facets?: boolean;
}

export interface ItemFacets {
  kind: Record<string, number>;
  type: Record<string, number>;
  indicator_type: Record<string, number>;
  added_by: Array<{ id: string; name: string; type: ActorType; count: number }>;
  status: Record<string, number>;
}

export interface FindItemsResponse {
  items: InvestigationItem[];
  total: number;
  page: number;
  per_page: number;
  next_cursor?: string | null;
  facets?: ItemFacets;
  took_ms: number;
}

export interface BulkCreateItemsRequest {
  items: ItemInput[];
  actor?: Actor;
  /**
   * Pull indicators out of newly attached alerts and add them as indicator evidence.
   * Default true; bulk loaders of thousands of alerts pass false.
   */
  extract_indicators?: boolean;
  /** Record the record id on the alerts (`kibana.alert.case_ids`). Default true. */
  link_alerts?: boolean;
}

export interface BulkCreateItemsResponse {
  items: InvestigationItem[];
  errors: Array<{ index: number; message: string }>;
  took_ms: number;
}

export interface UpdateItemRequest {
  patch: ItemPatch;
  /** Required: "seq_no:primary_term" from the last read. A mismatch returns 409. */
  version: string;
  actor?: Actor;
}

export interface BulkUpdateItemsRequest {
  items: Array<{ id: string; version?: string; patch: ItemPatch }>;
  actor?: Actor;
}

export interface BulkUpdateItemsResponse {
  items: InvestigationItem[];
  errors: Array<{ id: string; status: number; message: string }>;
}

export interface BulkDeleteItemsRequest {
  ids: string[];
}

export interface ImportIndicatorsRequest {
  /** CSV with a header row containing `value` and optionally `type`, `why`. */
  csv: string;
}

export interface ImportIndicatorsResponse {
  created: number;
  skipped_duplicates: number;
  errors: Array<{ line: number; message: string }>;
}

export interface ExportItemsRequest extends Omit<FindItemsRequest, 'page' | 'per_page' | 'cursor' | 'facets'> {
  format: 'csv' | 'json' | 'stix' | 'list';
}

export interface FindActivityRequest {
  /** Only entries strictly after this ISO time (live polling). */
  since?: string;
  search?: string;
  actor_type?: ActorType[];
  target_id?: string;
  action?: string[];
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface FindActivityResponse {
  entries: ActivityEntry[];
  total: number;
  page: number;
  per_page: number;
  /** ts of the newest entry for the record (use as the next `since`). */
  latest_ts: string | null;
}

export interface CreateActivityRequest {
  message: string;
  details?: string | null;
  links?: ActivityLink[];
  action?: string;
  target?: ActivityEntry['target'];
  actor?: Actor;
  ts?: string;
  before?: unknown;
  after?: unknown;
}

export interface RelatedRecord {
  record: Pick<
    InvestigationRecord,
    'id' | 'display_id' | 'title' | 'status' | 'priority' | 'created_at' | 'updated_at' | 'owner' | 'close_outcome' | 'counters' | 'summary' | 'origin'
  >;
  reasons: Array<{ type: 'indicator' | 'entity' | 'alert' | 'merged'; value: string }>;
  shared_values: string[];
}

export interface RelatedRecordsResponse {
  related: RelatedRecord[];
}

export interface DuplicateCheckRequest {
  entity_names?: string[];
  alert_ids?: string[];
  indicator_values?: string[];
  exclude_record_id?: string;
}

export interface IndicatorLookupResponse {
  /** Lowercased value -> other records containing it. */
  values: Record<string, { count: number; records: Array<{ id: string; display_id: string; title: string }> }>;
}

export interface SinceLastHandoffResponse {
  since: string | null;
  handoff_by: Actor | null;
  items: Array<{
    key: 'alerts' | 'indicators' | 'evidence' | 'verdict' | 'stale_claims' | 'owner' | 'claims';
    headline: string;
    detail: string;
    /** UI hint: which tab or item to open. */
    target?: ActivityLink | null;
  }>;
}

export interface ChangeHistoryResponse {
  versions: Array<{
    ts: string;
    actor: Actor;
    /** What changed: "Description", "Claim C3", "Closing summary", "Note E8". */
    what: string;
    text: string;
    target_id: string | null;
  }>;
}

export interface ReportResponse {
  markdown: string;
  filename: string;
}

export interface CreateThreadRequest {
  title: string;
  anchor?: string | null;
}

export interface CapabilitiesResponse {
  agent_builder_available: boolean;
  agent_id: string | null;
  connector_configured: boolean;
  reason?: string | null;
}

/** Agent Builder tool ids registered by the Cases plugin for investigations. */
export const INVESTIGATION_AGENT_TOOL_IDS = {
  readItems: 'platform.core.cases.investigation_read_items',
  addEvidence: 'platform.core.cases.investigation_add_evidence',
  upsertClaim: 'platform.core.cases.investigation_upsert_claim',
  setTaskStatus: 'platform.core.cases.investigation_set_task_status',
  upsertEntity: 'platform.core.cases.investigation_upsert_entity',
  proposeAction: 'platform.core.cases.investigation_propose_action',
} as const;

export const INVESTIGATION_AGENT_ID = 'cases-investigation-agent' as const;
export const INVESTIGATION_CONVERSATION_TEMPLATE_ID = 'cases_investigation' as const;
