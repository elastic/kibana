/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../common/types/domain';
import { CaseStatuses } from '../../common/types/domain';
import {
  CASE_OUTCOME_KI_TYPE,
  CLOSING_NOTES_WINDOW_MS,
  OBSERVABLE_TYPE_HOSTNAME,
  SECURITY_SOLUTION_OWNER,
  getCaseOutcomeKiId,
} from '../../common/constants';
import type { CasesClient } from '../client';

const LINKED_INVESTIGATION_TYPE = 'agentic.investigation';
// Knowledge indicator limits (context engine `kiFieldsSchema`).
const MAX_TAGS = 100;
const MAX_LIST_ATTRIBUTE = 100;
const MAX_DESCRIPTION = 300;
const MAX_CONTENT = 60_000;
const MAX_TAG_LENGTH = 256;
const ATTACHMENT_PAGE_SIZE = 100;

export type OutcomeSkipReason =
  | 'owner_not_published'
  | 'restricted'
  | 'not_closed'
  | 'publishing_off'
  | 'context_engine_off';

/** What a case shares with others; published as tags so they can be matched with one filter. */
export interface OutcomeMatchKeys {
  spaceId: string;
  owner: string;
  ruleNames: string[];
  hosts: string[];
  users: string[];
  observables: string[];
}

export interface CaseOutcomeKnowledgeItem {
  type: typeof CASE_OUTCOME_KI_TYPE;
  title: string;
  description: string;
  content: string;
  tags: string[];
  attributes: Record<string, string | number | boolean | string[]>;
  references: Array<{ uri: string; relation: 'derived_from' | 'relates_to'; description?: string }>;
}

export type CaseOutcomeResult =
  | { publish: true; retract: false; ki_id: string; ki: CaseOutcomeKnowledgeItem }
  | { publish: false; retract: boolean; ki_id: string; skip_reason: OutcomeSkipReason };

export interface CaseOutcomeInputs {
  theCase: Case;
  spaceId: string;
  ruleNames: string[];
  alertRefs: Array<{ index: string; id: string }>;
  investigations: Array<{ id: string; title: string }>;
  closingNotes?: string;
}

const unique = (values: Array<string | null | undefined>) => [
  ...new Set(values.flatMap((value) => (value ? [value.trim()] : [])).filter(Boolean)),
];

const tag = (prefix: string, value: string) => `${prefix}:${value}`.slice(0, MAX_TAG_LENGTH);

/** The tags that say what an outcome shares with other cases; Prior outcomes matches on them. */
export const getOutcomeMatchTags = (keys: Omit<OutcomeMatchKeys, 'spaceId' | 'owner'>) => [
  ...keys.ruleNames.map((value) => tag('rule', value)),
  ...keys.hosts.map((value) => tag('host', value)),
  ...keys.users.map((value) => tag('user', value)),
  ...keys.observables.map((value) => tag('observable', value)),
];

export const getOutcomeScopeTags = ({
  spaceId,
  owner,
}: Pick<OutcomeMatchKeys, 'spaceId' | 'owner'>) => [tag('space', spaceId), tag('owner', owner)];

export const getMatchKeysFromCase = (
  theCase: Pick<Case, 'observables' | 'owner'>,
  spaceId: string,
  ruleNames: string[]
): OutcomeMatchKeys => {
  const observables = theCase.observables ?? [];
  return {
    spaceId,
    owner: theCase.owner,
    ruleNames: unique(ruleNames).slice(0, MAX_LIST_ATTRIBUTE),
    hosts: unique(
      observables
        .filter(({ typeKey }) => typeKey === OBSERVABLE_TYPE_HOSTNAME.key)
        .map(({ value }) => value)
    ).slice(0, MAX_LIST_ATTRIBUTE),
    users: unique(
      observables.filter(({ typeKey }) => /user/i.test(typeKey)).map(({ value }) => value)
    ).slice(0, MAX_LIST_ATTRIBUTE),
    observables: unique(observables.map(({ value }) => value)).slice(0, MAX_LIST_ATTRIBUTE),
  };
};

const secondsBetween = (from: string, to: string | null) => {
  if (!to) return undefined;
  const ms = Date.parse(to) - Date.parse(from);
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 1000) : undefined;
};

const section = (title: string, lines: string[]) =>
  lines.length > 0 ? [`## ${title}`, ...lines, ''] : [];

/**
 * Builds the knowledge indicator for a closed case. Pure: everything it needs is passed in, so
 * what is published is decided here and nowhere else.
 */
export const buildCaseOutcome = ({
  theCase,
  spaceId,
  ruleNames,
  alertRefs,
  investigations,
  closingNotes,
}: CaseOutcomeInputs): { ki_id: string; ki: CaseOutcomeKnowledgeItem } => {
  const keys = getMatchKeysFromCase(theCase, spaceId, ruleNames);
  const closeReason = theCase.close_reason ?? undefined;
  const aiVerdict = theCase.ai_verdict ?? undefined;
  const humanVerdict = theCase.human_verdict ?? undefined;
  const agreement = aiVerdict && humanVerdict ? aiVerdict.verdict === humanVerdict : undefined;
  const timeToResolve = secondsBetween(theCase.created_at, theCase.closed_at);
  const caseNumber = theCase.incremental_id != null ? `#${theCase.incremental_id}` : theCase.id;

  const content = [
    `# Case ${caseNumber}: ${theCase.title}`,
    '',
    ...section('Outcome', [
      `- Close reason: ${closeReason ?? 'none recorded'}`,
      `- Human verdict: ${humanVerdict ?? 'none'}`,
      `- AI verdict: ${
        aiVerdict
          ? `${aiVerdict.verdict}${
              aiVerdict.confidence != null ? ` (confidence ${aiVerdict.confidence})` : ''
            }`
          : 'none'
      }`,
      ...(agreement !== undefined
        ? [`- The analyst ${agreement ? 'agreed' : 'disagreed'} with the AI verdict.`]
        : []),
      `- Severity: ${theCase.severity}`,
      ...(theCase.closed_at ? [`- Closed: ${theCase.closed_at}`] : []),
    ]),
    ...section('Closing notes', closingNotes ? [closingNotes] : []),
    ...section(
      'Rules',
      keys.ruleNames.map((name) => `- ${name}`)
    ),
    ...section(
      'Linked investigations',
      investigations.map(({ title }) => `- ${title}`)
    ),
    ...section(
      'Observables',
      (theCase.observables ?? [])
        .slice(0, MAX_LIST_ATTRIBUTE)
        .map(({ typeKey, value }) => `- ${typeKey}: ${value}`)
    ),
  ]
    .join('\n')
    .slice(0, MAX_CONTENT);

  const attributes: CaseOutcomeKnowledgeItem['attributes'] = {
    case_id: theCase.id,
    space_id: spaceId,
    owner: theCase.owner,
    severity: theCase.severity,
    rule_names: keys.ruleNames,
    hosts: keys.hosts,
    users: keys.users,
    observables: keys.observables,
    ...(theCase.incremental_id != null ? { incremental_id: theCase.incremental_id } : {}),
    ...(closeReason ? { close_reason: closeReason } : {}),
    ...(aiVerdict ? { ai_verdict: aiVerdict.verdict } : {}),
    ...(aiVerdict?.confidence != null ? { ai_confidence: aiVerdict.confidence } : {}),
    ...(humanVerdict ? { human_verdict: humanVerdict } : {}),
    ...(agreement !== undefined ? { agreement } : {}),
    ...(theCase.template?.id ? { template_id: theCase.template.id } : {}),
    ...(theCase.source ? { source: theCase.source } : {}),
    ...(theCase.closed_at ? { closed_at: theCase.closed_at } : {}),
    ...(timeToResolve !== undefined ? { time_to_resolve: timeToResolve } : {}),
  };

  const tags = unique([
    CASE_OUTCOME_KI_TYPE,
    ...getOutcomeScopeTags(keys),
    ...(closeReason ? [tag('close_reason', closeReason)] : []),
    tag('severity', theCase.severity),
    ...getOutcomeMatchTags(keys),
  ]).slice(0, MAX_TAGS);

  return {
    ki_id: getCaseOutcomeKiId(theCase.id),
    ki: {
      type: CASE_OUTCOME_KI_TYPE,
      title: theCase.title.slice(0, 512),
      description: (closingNotes || theCase.description || theCase.title).slice(0, MAX_DESCRIPTION),
      content,
      tags,
      attributes,
      references: [
        { uri: `case://${theCase.id}`, relation: 'derived_from' },
        ...alertRefs.slice(0, MAX_LIST_ATTRIBUTE - 1).map(({ index, id }) => ({
          uri: `alert://${index}/${id}`,
          relation: 'relates_to' as const,
        })),
      ],
    },
  };
};

const asArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : typeof value === 'string'
    ? [value]
    : [];

/**
 * Reads what the outcome needs through the Cases client, so the caller's (or the workflow's)
 * Cases privileges apply. Only the closer's latest comment written just before the close is
 * read as closing notes; no other comment is ever published.
 */
export const collectCaseOutcomeInputs = async (
  client: CasesClient,
  theCase: Case,
  spaceId: string
): Promise<CaseOutcomeInputs> => {
  const found = await client.attachments.find({
    caseID: theCase.id,
    findQueryParams: { perPage: ATTACHMENT_PAGE_SIZE, sortOrder: 'desc' },
  });

  const ruleNames: string[] = [];
  const alertRefs: Array<{ index: string; id: string }> = [];
  const investigations: Array<{ id: string; title: string }> = [];
  let closingNotes: string | undefined;
  const closedAt = theCase.closed_at ? Date.parse(theCase.closed_at) : undefined;
  const closer = theCase.closed_by?.profile_uid ?? theCase.closed_by?.username;
  // Notes come from the close modal, which always records a close reason; a close without one
  // (the status menu, a bulk action, the API) publishes no comment at all.
  const takesNotes = Boolean(theCase.close_reason);

  for (const attachment of found.data) {
    const metadata = ('metadata' in attachment ? attachment.metadata ?? {} : {}) as Record<
      string,
      unknown
    >;
    const rule = metadata.rule as { name?: unknown } | undefined;
    if (typeof rule?.name === 'string') {
      ruleNames.push(rule.name);
      const ids = 'attachmentId' in attachment ? asArray(attachment.attachmentId) : [];
      const indices = asArray(metadata.index);
      ids.forEach((id, i) => alertRefs.push({ id, index: indices[i] ?? indices[0] ?? '' }));
    }
    if (attachment.type === LINKED_INVESTIGATION_TYPE && 'attachmentId' in attachment) {
      investigations.push({
        id: String(attachment.attachmentId),
        title:
          typeof metadata.title === 'string' ? metadata.title : String(attachment.attachmentId),
      });
    }
    if (
      closingNotes === undefined &&
      takesNotes &&
      closedAt !== undefined &&
      attachment.type === 'comment' &&
      'data' in attachment
    ) {
      const author = attachment.created_by?.profile_uid ?? attachment.created_by?.username;
      const createdAt = Date.parse(attachment.created_at);
      const text = (attachment.data as { content?: unknown } | undefined)?.content;
      if (
        typeof text === 'string' &&
        author != null &&
        author === closer &&
        createdAt <= closedAt &&
        closedAt - createdAt <= CLOSING_NOTES_WINDOW_MS
      ) {
        closingNotes = text;
      }
    }
  }

  return { theCase, spaceId, ruleNames, alertRefs, investigations, closingNotes };
};

/**
 * Decides whether a case's outcome is published (or retracted) and builds it. Restricted cases
 * are never published, whatever else is true.
 */
export const getCaseOutcome = async ({
  client,
  caseId,
  spaceId,
  isContextEngineEnabled,
}: {
  client: CasesClient;
  caseId: string;
  spaceId: string;
  isContextEngineEnabled: () => Promise<boolean>;
}): Promise<CaseOutcomeResult> => {
  const kiId = getCaseOutcomeKiId(caseId);
  const theCase = await client.cases.get({ id: caseId, includeComments: false });

  if (theCase.access?.mode === 'restricted') {
    return { publish: false, retract: true, ki_id: kiId, skip_reason: 'restricted' };
  }
  // Agents read the knowledge index outside Cases' owner privileges, so only the owner whose
  // agents consume it (Security, for AlertZero) publishes.
  if (theCase.owner !== SECURITY_SOLUTION_OWNER) {
    return { publish: false, retract: false, ki_id: kiId, skip_reason: 'owner_not_published' };
  }
  // Nothing can be published or removed while the context engine is off in the space.
  if (!(await isContextEngineEnabled())) {
    return { publish: false, retract: false, ki_id: kiId, skip_reason: 'context_engine_off' };
  }
  if (theCase.status !== CaseStatuses.closed) {
    return { publish: false, retract: true, ki_id: kiId, skip_reason: 'not_closed' };
  }
  const [configuration] = await client.configure.get({ owner: theCase.owner });
  if (configuration?.knowledge?.publishOutcomes === false) {
    return { publish: false, retract: false, ki_id: kiId, skip_reason: 'publishing_off' };
  }

  const built = buildCaseOutcome(await collectCaseOutcomeInputs(client, theCase, spaceId));
  return { publish: true, retract: false, ...built };
};
