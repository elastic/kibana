/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Seeds synthetic investigations for local development and review of the investigation template
 * UI. Run from the repo root:
 *
 *   node -r @kbn/setup-node-env x-pack/platform/plugins/shared/agentic_investigations/scripts/nightshift_seed_investigations.ts
 *
 * Add --help to list the connection flags, --clean to only remove earlier seeds.
 *
 * Each scenario is written the way an investigating agent leaves it:
 *
 * - An Agent Builder conversation on the `investigation` template, run by the default Agent
 *   Builder agent, public, owned by the --auth user, with the `status` / `severity` / `summary` /
 *   `verdict` metadata. Its id is derived from the scenario, so a re-run replaces it.
 * - Its subject, impact, and hypotheses documents in the agentic investigations side indexes,
 *   each attached to the conversation by reference (hidden, `origin` = document id).
 * - Its proposed actions, created by the proposals gate workflow that `proposals.create` runs.
 *
 * Kibana HTTP APIs do the writes wherever a route exists. The side-index documents and the
 * conversation timestamps have none, so they are written straight to Elasticsearch as the
 * kibana_system user. No AI connector or agent run is needed.
 */

import { createHash } from 'crypto';
import { v5 as uuidv5 } from 'uuid';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { types } from '@kbn/storage-adapter';
import type { StorageSchema } from '@kbn/storage-adapter';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import {
  PROPOSALS_API_VERSION,
  PROPOSALS_INDEX_NAME,
  PROPOSALS_INTERNAL_URL,
} from '@kbn/proposals-common';
import type { ListProposalsResponse, ProposalConfidence } from '@kbn/proposals-common';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  HYPOTHESES_ATTACHMENT_TYPE,
  HYPOTHESES_INDEX_NAME,
  IMPACT_ATTACHMENT_TYPE,
  IMPACT_INDEX_NAME,
  INVESTIGATION_STATUS_URL,
  INVESTIGATION_TEMPLATE_ID,
  INVESTIGATIONS_INTERNAL_URL,
  SUBJECT_ATTACHMENT_TYPE,
  SUBJECT_INDEX_NAME,
} from '../common';
import type {
  AlertSubjectSnapshot,
  EvidenceChart,
  EvidenceChartAnnotation,
  EvidenceChartSeries,
  Hypothesis,
  Impact,
  ImpactEntity,
  InvestigationEvidence,
  InvestigationHypotheses,
  InvestigationMetadataStatus,
  InvestigationSeverity,
  InvestigationSubject,
  InvestigationSubjectInput,
  InvestigationSubjectTriggerType,
  ListInvestigationsResponse,
  User,
} from '../common';

/** Namespace of the seeded conversation ids: `uuidv5(<scenario subject id>, SEED_ID_NAMESPACE)`. */
const SEED_ID_NAMESPACE = '0c3b8a52-7f0e-4d2a-9a3e-5d1f2b7c9e41';
/** Space the investigations are seeded in. */
const SPACE_ID = 'default';

/** The proposals gate workflow (`CREATE_PROPOSAL_WORKFLOW_ID` in `@kbn/workflows/managed`). */
const CREATE_PROPOSAL_WORKFLOW_ID = 'system-create-proposal';

/** Workflow execution statuses that end a run (`TerminalExecutionStatuses` in `@kbn/workflows`). */
const TERMINAL_EXECUTION_STATUSES = ['completed', 'failed', 'cancelled', 'skipped', 'timed_out'];

/** Attachment type of a proposal card (`PROPOSAL_ATTACHMENT_TYPE` in `@kbn/proposals-common`). */
const PROPOSAL_ATTACHMENT_TYPE = 'platform.proposal';

/** Agent Builder's conversation index (`chatSystemIndex('conversations')` in `@kbn/agent-builder-server`). */
const CONVERSATIONS_INDEX = '.chat-conversations';

/** Agent Builder public API version. */
const PUBLIC_API_VERSION = '2023-10-31';

type ChartUnit = NonNullable<EvidenceChart['y_axis']['unit']>;
type SeedSubject = Omit<InvestigationSubjectInput, 'triggerType'>;
type SeedImpact = Pick<Impact, 'summary' | 'evidence' | 'entities'>;

/** A proposed action, created like `proposals.create` creates one (`origin: agent_builder`). */
interface SeedProposal {
  title: string;
  comment: string;
  confidence: ProposalConfidence;
}

interface Scenario {
  /** Omitted to show how an investigation reads before Agent Builder titles it. */
  title?: string;
  status: InvestigationMetadataStatus;
  severity?: InvestigationSeverity;
  /** What happened (`metadata.summary`). */
  summary?: string;
  /** The conclusion (`metadata.verdict`). */
  verdict?: string;
  subject: SeedSubject;
  triggerType: InvestigationSubjectTriggerType;
  hypotheses?: Hypothesis[];
  impact?: SeedImpact;
  proposals: SeedProposal[];
  createdMinutesAgo: number;
  updatedMinutesAgo: number;
}

const now = Date.now();
const iso = (minutesAgo: number): string =>
  new Date(now - minutesAgo * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z');

/** A time series whose last point is `endMinutesAgo` minutes ago, one point every `stepMinutes`. */
const timeSeries = (
  name: string,
  endMinutesAgo: number,
  values: number[],
  stepMinutes = 5
): EvidenceChartSeries => ({
  name,
  points: values.map((y, index) => ({
    x: iso(endMinutesAgo + (values.length - 1 - index) * stepMinutes),
    y,
  })),
});

/** A point annotation, or a range annotation when `endMinutesAgo` is set. */
const annotation = (
  minutesAgo: number,
  label: string,
  endMinutesAgo?: number
): EvidenceChartAnnotation => ({
  x: iso(minutesAgo),
  ...(endMinutesAgo !== undefined && { x_end: iso(endMinutesAgo) }),
  label,
});

const timeChart = ({
  title,
  type = 'line',
  yLabel,
  unit,
  stacked,
  series,
  annotations,
}: {
  title: string;
  type?: EvidenceChart['type'];
  yLabel: string;
  unit?: ChartUnit;
  stacked?: boolean;
  series: EvidenceChartSeries[];
  annotations?: EvidenceChartAnnotation[];
}): EvidenceChart => ({
  type,
  title,
  x_axis: { type: 'time' },
  y_axis: { label: yLabel, ...(unit && { unit }) },
  ...(stacked && { stacked }),
  series,
  ...(annotations && { annotations }),
});

const evidence = (description: string, chart?: EvidenceChart): InvestigationEvidence => ({
  description,
  ...(chart && { chart }),
});

const hypothesis = (
  candidate: string,
  confidence: number,
  status: Hypothesis['status'],
  reason: string,
  ...evidences: InvestigationEvidence[]
): Hypothesis => ({
  candidate,
  confidence,
  status,
  reason,
  ...(evidences.length > 0 && { evidence: evidences }),
});

/** `proposals.create` takes a confidence level, not a score. */
const toConfidenceLevel = (score: number): ProposalConfidence =>
  score >= 0.85 ? 'high' : score >= 0.7 ? 'medium' : 'low';

/** A proposed action. Its comment is the description, then the command in a fenced block. */
const recommendation = (
  title: string,
  confidence: number,
  description: string,
  code?: string
): SeedProposal => ({
  title,
  confidence: toConfidenceLevel(confidence),
  comment: code ? `${description}\n\n\`\`\`\n${code}\n\`\`\`` : description,
});

/** An impacted entity. The agent's `set_impact` tool defaults the id to the name. */
const entity = (
  name: string,
  type: string,
  streamName: string,
  featureId?: string,
  entityEvidence?: InvestigationEvidence
): ImpactEntity => ({
  id: name,
  name,
  type,
  streamName,
  ...(featureId && { featureId }),
  ...(entityEvidence && { evidence: entityEvidence }),
});

/** An investigation the agent finished: findings, impact, and proposed actions. */

const completed = ({
  severity,
  title,
  subject,
  minutesAgo,
  durationMinutes,
  triggerType = 'automatic',
  status = 'open',
  summary,
  verdict,
  hypotheses,
  recommendations = [],
  impact,
}: {
  severity: InvestigationSeverity;
  title: string;
  subject: SeedSubject;
  minutesAgo: number;
  durationMinutes: number;
  triggerType?: InvestigationSubjectTriggerType;
  status?: InvestigationMetadataStatus;
  summary: string;
  verdict: string;
  hypotheses?: Hypothesis[];
  recommendations?: SeedProposal[];
  impact: SeedImpact;
}): Scenario => ({
  title,
  status,
  severity,
  summary,
  verdict,
  subject,
  triggerType,
  hypotheses,
  impact,
  proposals: recommendations,
  createdMinutesAgo: minutesAgo + durationMinutes,
  updatedMinutesAgo: minutesAgo,
});

/**
 * An investigation without findings: one that was just started, or whose run ended before the
 * agent recorded any. Investigations keep no run status, so these are open (or closed) and not in
 * progress.
 */

const unfinished = ({
  status = 'open',
  title,
  subject,
  minutesAgo,
  triggerType = 'automatic',
}: {
  status?: InvestigationMetadataStatus;
  title?: string;
  subject: SeedSubject;
  minutesAgo: number;
  triggerType?: InvestigationSubjectTriggerType;
}): Scenario => ({
  title,
  status,
  subject,
  triggerType,
  proposals: [],
  createdMinutesAgo: minutesAgo,
  updatedMinutesAgo: minutesAgo,
});

/** An alert subject's snapshot, as the start route records it from the alert document. */

const alertSnapshot = (
  id: string,
  ruleName: string,
  reason: string,
  startMinutesAgo: number
): AlertSubjectSnapshot => ({
  id,
  rule_id: `seed-rule-${id}`,
  rule_name: ruleName,
  rule_type_id: 'observability.rules.custom_threshold',
  rule_category: 'Custom threshold',
  reason,
  status: 'active',
  start: iso(startMinutesAgo),
  timestamp: iso(startMinutesAgo),
});

const SCENARIOS: Scenario[] = [
  completed({
    severity: 'high',
    title: 'Checkout error rate alert traced to payment-service restarts',
    subject: {
      type: 'alert',
      id: 'alert-checkout-error-rate',
      summary: 'Checkout error rate above 5% for 10 minutes',
      snapshot: alertSnapshot(
        'alert-checkout-error-rate',
        'Checkout error rate above 5%',
        'Checkout error rate is 8.1%, above the threshold of 5% for the last 10 minutes.',
        104
      ),
    },
    minutesAgo: 100,
    durationMinutes: 4,
    summary:
      'The checkout error rate alert fired three times in two hours. Every spike lines up with a payment-service pod restart.',
    verdict:
      'The alert is a downstream symptom of the payment-service memory leak. Checkout itself is healthy between restarts.',
    hypotheses: [
      hypothesis(
        'payment-service restarts cause checkout failures',
        0.84,
        'confirmed',
        'Error spikes and pod restarts share the same timestamps.',
        evidence(
          'payment-service pods were `OOMKilled` at each checkout error spike.',
          timeChart({
            title: 'payment-service pod restarts',
            type: 'bar',
            yLabel: 'Restarts per 10 minutes',
            unit: 'number',
            series: [timeSeries('Restarts', 100, [0, 3, 0, 0, 0, 3, 0, 0, 3, 0, 0, 0], 10)],
          })
        )
      ),
    ],
    recommendations: [
      recommendation(
        'Group this alert with the payment-service investigation',
        0.7,
        'Avoids duplicate pages for one root cause.'
      ),
    ],
    impact: {
      summary:
        'Checkout fails for about 8% of shoppers for roughly ten minutes after each payment-service restart, three times in the last two hours. Checkout is healthy in between.',
      entities: [
        entity(
          'web-frontend',
          'service',
          'logs.web-frontend',
          'web-frontend',
          evidence(
            'Shoppers get a payment error on the last step; their carts are kept, so most retry.',
            timeChart({
              title: 'Checkout error rate',
              yLabel: 'Error rate',
              unit: 'percent',
              series: [
                timeSeries(
                  'Error rate',
                  100,
                  [0.4, 8.1, 3.2, 0.5, 0.4, 7.9, 2.9, 0.4, 8.3, 3.0, 0.5, 0.4],
                  10
                ),
              ],
            })
          )
        ),
        entity(
          'payment-service',
          'service',
          'logs.payment-service',
          'payment-service',
          evidence(
            'Payment calls from checkout fail while each pod restarts:\n\n| Restart | Failed calls | Duration |\n| --- | --- | --- |\n| 1 | 212 | 9 min |\n| 2 | 198 | 11 min |\n| 3 | 205 | 10 min |'
          )
        ),
      ],
    },
  }),
  completed({
    severity: 'medium',
    title: 'Nightly batch saturates the cache-service connection pool',
    subject: {
      type: 'manual',
      id: 'manual-cache-latency',
      summary: 'Why does cache latency rise every night at 02:00?',
    },
    minutesAgo: 600,
    durationMinutes: 10,
    triggerType: 'manual',
    summary:
      'cache-service P99 latency rises from 2ms to 40ms every night between 02:00 and 02:20 UTC.',
    verdict:
      'The nightly price-sync batch opens 400 connections to cache-service and exhausts its pool. Online traffic queues behind it for about 20 minutes.',
    hypotheses: [
      hypothesis(
        'price-sync batch exhausts the connection pool',
        0.78,
        'confirmed',
        'Connection count peaks with the batch schedule.',
        evidence(
          'Open connections hit the pool limit of **400** while the batch runs, and P99 latency follows.',
          timeChart({
            title: 'cache-service open connections',
            yLabel: 'Connections',
            unit: 'number',
            series: [
              timeSeries('Open connections', 600, [42, 45, 44, 400, 400, 400, 400, 60, 41, 44]),
            ],
            annotations: [annotation(630, 'price-sync batch', 610)],
          })
        )
      ),
      hypothesis('Redis RDB snapshot at 02:00', 0.1, 'dismissed', 'Snapshots run at 04:00.'),
    ],
    recommendations: [
      recommendation(
        'Limit price-sync to 50 connections',
        0.75,
        'Keeps headroom for online traffic.'
      ),
    ],
    impact: {
      summary:
        'For about 20 minutes each night, cart and pricing reads from cache-service slow from 2ms to 40ms P99. It is a low-traffic hour, so few shoppers notice, and there are no errors.',
      evidence: evidence(
        'P99 latency on cache-service during the batch window:\n\n| Window | P99 latency |\n| --- | --- |\n| 01:40–02:00 | 2ms |\n| 02:00–02:20 | 40ms |\n| 02:20–02:40 | 3ms |'
      ),
    },
  }),
  // Every overview section at once, each in its fuller form: a long "What's happened" and impact
  // summary (both behind Show more), impact evidence with a stacked, annotated chart, and entities
  // of every shape: Entity Store ids (which open the entity flyout when Security registered an
  // opener), names with chart or markdown evidence, a name without evidence, and one without a type.
  completed({
    severity: 'critical',
    title: 'Orders API outage after the inventory-db failover',
    subject: {
      type: 'alert',
      id: 'alert-orders-5xx',
      summary: 'orders-api 5xx rate above 20%',
      snapshot: alertSnapshot(
        'alert-orders-5xx',
        'orders-api 5xx rate above 20%',
        'orders-api returns 5xx for 34% of requests, above the threshold of 20%.',
        95
      ),
    },
    minutesAgo: 30,
    durationMinutes: 45,
    summary:
      'orders-api started failing 34% of requests at 09:12, two minutes after inventory-db failed over to its replica in eu-west-1b. The new primary rejected writes for 18 minutes while it replayed its WAL, and orders-api retried every rejected write three times, which tripled the load on the replica and kept it from catching up.',
    verdict:
      'The **inventory-db failover** caused the outage: the new primary replayed its WAL for 18 minutes and rejected writes meanwhile.\n\n- orders-api retries made the replay slower.\n- Checkout and the storefront degraded because they read order state from orders-api.\n\nNo data was lost; every rejected write was retried after the replay.',
    hypotheses: [
      hypothesis(
        'inventory-db failover leaves the new primary read-only during WAL replay',
        0.91,
        'confirmed',
        'Write rejections start with the failover and stop when the replay completes.',
        evidence(
          'Write rejections start at the failover and stop when the WAL replay ends.',
          timeChart({
            title: 'inventory-db rejected writes',
            type: 'bar',
            yLabel: 'Rejected writes per minute',
            unit: 'number',
            series: [
              timeSeries('Rejected writes', 30, [0, 0, 820, 1900, 2100, 1750, 900, 40, 0, 0], 5),
            ],
            annotations: [annotation(75, 'Failover'), annotation(70, 'WAL replay', 50)],
          })
        ),
        evidence('The replica log shows `recovery in progress` from **09:10** to **09:28** UTC.')
      ),
      hypothesis(
        'orders-api retry storm amplifies the outage',
        0.55,
        'investigating',
        'Retries triple write traffic, but the replay would have taken time regardless.',
        evidence(
          'Retries triple the write traffic while the primary rejects writes.',
          timeChart({
            title: 'orders-api write requests',
            type: 'bar',
            yLabel: 'Requests per minute',
            unit: 'number',
            stacked: true,
            series: [
              timeSeries('Original', 30, [600, 610, 620, 600, 615, 605, 610, 600, 600, 610], 5),
              timeSeries('Retried', 30, [0, 0, 1700, 1800, 1850, 1700, 900, 30, 0, 0], 5),
            ],
          })
        )
      ),
      hypothesis(
        'A bad orders-api deploy',
        0.05,
        'dismissed',
        'The last orders-api deploy was two days ago.'
      ),
    ],
    recommendations: [
      recommendation(
        'Cap orders-api write retries at one, with backoff',
        0.9,
        'Stops retries from tripling the load on a recovering primary.',
        'kubectl -n orders set env deploy/orders-api WRITE_RETRY_MAX=1 WRITE_RETRY_BACKOFF_MS=500'
      ),
      recommendation(
        'Fail inventory-db over to a hot standby',
        0.72,
        'A hot standby replays continuously, so a failover does not pause writes.'
      ),
      recommendation(
        'Page the database on-call on every failover',
        0.4,
        'Nobody was paged; the outage was found from the orders-api alert.'
      ),
    ],
    impact: {
      summary:
        'For 18 minutes, from 09:12 to 09:30 UTC, about a third of all order writes failed on the first try. Shoppers saw "Something went wrong" on the last checkout step, and roughly 1,900 of them abandoned their cart, which is about 9% of the checkouts in that window. The storefront kept working but showed stale order states, so some shoppers placed the same order twice: 140 duplicate orders need a refund. Partners on the orders API saw the same errors; two of them paused their integrations and have to resume them by hand. No order data was lost, since every write went through once the replay finished, but support received 320 tickets in the first hour.',
      evidence: evidence(
        'Checkout success drops to 65% during the outage and recovers once the replay ends.',
        timeChart({
          title: 'Checkout success rate',
          yLabel: 'Success rate',
          unit: 'percent',
          series: [
            timeSeries(
              'Success rate',
              30,
              [99.1, 99.0, 71.2, 64.8, 66.3, 70.1, 88.4, 98.7, 99.0, 99.1],
              5
            ),
          ],
          annotations: [annotation(72, 'Outage', 54)],
        })
      ),
      entities: [
        {
          id: 'service:orders-api',
          name: 'orders-api',
          type: 'service',
          evidence: evidence(
            'orders-api fails a third of its requests during the outage.',
            timeChart({
              title: 'orders-api 5xx rate',
              yLabel: '5xx rate',
              unit: 'percent',
              series: [
                timeSeries('5xx rate', 30, [0.2, 0.3, 31, 34, 33, 29, 12, 0.4, 0.2, 0.2], 5),
              ],
            })
          ),
        },
        { id: 'host:inventory-db-2', name: 'inventory-db-2', type: 'host' },
        entity(
          'checkout',
          'service',
          'logs.checkout',
          'checkout',
          evidence(
            'Checkout failures by step:\n\n| Step | Failures |\n| --- | --- |\n| Payment | 40 |\n| Place order | 1,870 |'
          )
        ),
        entity('storefront', 'service', 'logs.storefront'),
        { id: 'partner-orders-integrations', name: 'Partner integrations' },
      ],
    },
  }),
  // Closed, with an impact that only names entities: no summary, no evidence.
  completed({
    severity: 'low',
    status: 'closed',
    title: 'Search latency blip during the index rollover',
    subject: {
      type: 'manual',
      id: 'manual-search-latency',
      summary: 'Why was search slow at 06:00?',
    },
    minutesAgo: 900,
    durationMinutes: 5,
    triggerType: 'manual',
    summary: 'Search P95 rose to 900ms for two minutes at 06:00 UTC.',
    verdict: 'The daily index rollover. Expected and short; no action needed.',
    impact: {
      entities: [
        entity('search-api', 'service', 'logs.search-api'),
        entity('product-search', 'service', 'logs.product-search'),
      ],
    },
  }),
  // Just started: no findings and no title yet, so the UI names it after its subject.
  unfinished({
    subject: {
      type: 'alert',
      id: 'alert-kafka-disk',
      summary: 'Kafka broker disk usage above 80%',
      snapshot: alertSnapshot(
        'alert-kafka-disk',
        'Kafka broker disk usage above 80%',
        'Disk usage on kafka-broker-2 is 84%, above the threshold of 80%.',
        205
      ),
    },
    minutesAgo: 200,
  }),
];

/** The stable conversation id of a scenario: a re-run replaces the same investigation. */
const seedConversationId = ({ subject }: Scenario): string =>
  uuidv5(`agentic-investigations-seed:${subject.id}`, SEED_ID_NAMESPACE);

/**
 * Side-index document id, as `hashInvestigationAttachmentId` in the agentic investigations
 * plugin (`server/investigation_attachments/doc_id.ts`) computes it: a SHA-256 of the
 * length-prefixed parts. Each entity's `documentId` passes its attachment type first, except
 * impact, whose ids predate the factory (`legacyUntypedDocumentIds`).
 */
const hashDocumentId = (...parts: string[]): string =>
  createHash('sha256')
    .update(parts.map((part) => `${part.length}:${part}`).join('\0'))
    .digest('hex');

const subjectDocumentId = (conversationId: string, { type, id }: SeedSubject): string =>
  hashDocumentId(SUBJECT_ATTACHMENT_TYPE, SPACE_ID, conversationId, type, id);
const hypothesesDocumentId = (conversationId: string): string =>
  hashDocumentId(HYPOTHESES_ATTACHMENT_TYPE, SPACE_ID, conversationId);
const impactDocumentId = (conversationId: string): string =>
  hashDocumentId(SPACE_ID, conversationId);

const userMapping = types.object({
  properties: {
    username: types.keyword({}),
    fullName: types.keyword({}),
    email: types.keyword({}),
    profileUid: types.keyword({}),
  },
});

/**
 * Mappings of the side indexes, mirroring each entity's `server/<entity>/storage/*_storage.ts`
 * with the storage adapter's own `types` factories, so every field carries the adapter's defaults
 * (`ignore_above` on keywords, `format` on dates). Only installed when the plugin's storage adapter
 * has not created the index yet; the adapter then puts its versioned mappings on its next read or
 * write, which Elasticsearch only accepts while the field parameters are identical.
 */
const SIDE_INDEX_MAPPINGS: Record<string, StorageSchema['properties']> = {
  [SUBJECT_INDEX_NAME]: {
    spaceId: types.keyword({}),
    conversationId: types.keyword({}),
    subjectType: types.keyword({}),
    subjectId: types.keyword({}),
    summary: types.text({}),
    triggerType: types.keyword({}),
    snapshot: types.object({ enabled: false }),
    slack: types.object({
      properties: {
        channel: types.keyword({}),
        thread_ts: types.keyword({}),
        status_message_ts: types.keyword({}),
        permalink: types.keyword({ index: false }),
        seen_event_ids: types.keyword({ index: false }),
      },
    }),
    createdAt: types.date({}),
    updatedAt: types.date({}),
    createdBy: userMapping,
  },
  [IMPACT_INDEX_NAME]: {
    spaceId: types.keyword({}),
    conversationId: types.keyword({}),
    summary: types.text({}),
    evidence: types.object({ enabled: false }),
    entities: types.nested({
      properties: {
        id: types.keyword({}),
        name: types.keyword({}),
        type: types.keyword({}),
        featureId: types.keyword({}),
        streamName: types.keyword({}),
        evidence: types.object({ enabled: false }),
      },
    }),
    createdAt: types.date({}),
    updatedAt: types.date({}),
    createdBy: userMapping,
  },
  [HYPOTHESES_INDEX_NAME]: {
    spaceId: types.keyword({}),
    conversationId: types.keyword({}),
    hypotheses: types.object({ enabled: false }),
    createdAt: types.date({}),
    updatedAt: types.date({}),
    createdBy: userMapping,
  },
};

/** Indexes a clean removes the seeded investigations' documents from. */
const SEEDED_DOCUMENT_INDEXES = [
  SUBJECT_INDEX_NAME,
  IMPACT_INDEX_NAME,
  HYPOTHESES_INDEX_NAME,
  PROPOSALS_INDEX_NAME,
];

type JsonBody = object | undefined;

interface HttpResponse<TBody> {
  status: number;
  body: TBody;
}

const basicAuth = (credentials: string): string =>
  `Basic ${Buffer.from(credentials).toString('base64')}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls `check` every half second until it returns a value, for at most `timeoutMs`. */
const waitFor = async <T>(
  label: string,
  check: () => Promise<T | undefined>,
  timeoutMs = 60_000
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await check();
    if (value !== undefined) {
      return value;
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const sendJson = async <TBody>(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: JsonBody,
  okStatuses: number[]
): Promise<HttpResponse<TBody>> => {
  const response = await fetch(url, {
    method,
    headers: { ...headers, ...(body !== undefined && { 'Content-Type': 'application/json' }) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  if (!response.ok && !okStatuses.includes(response.status)) {
    throw new Error(`${method} ${url} failed with ${response.status}: ${text.slice(0, 500)}`);
  }
  return { status: response.status, body: (text ? JSON.parse(text) : {}) as TBody };
};

const resolveKibanaUrl = async (url: string, auth: string): Promise<string> => {
  const base = url.replace(/\/$/, '');
  if (new URL(base).pathname !== '/') {
    return base;
  }
  const response = await fetch(`${base}/`, {
    redirect: 'manual',
    headers: { Authorization: basicAuth(auth) },
  });
  const location = response.headers.get('location');
  return location && /^\/[^/?]+\/?$/.test(location)
    ? `${base}${location.replace(/\/$/, '')}`
    : base;
};

/**
 * Logs in through the basic login form, like a browser does, so the requests carry the user's
 * profile: Agent Builder then records the profile uid as the conversation owner, the same id the
 * user's browser session has. Plain basic auth would record a realm-based id instead, and the
 * browser session would not own the seeded investigations.
 */
const loginHeaders = async (
  kibanaUrl: string,
  auth: string,
  log: ToolingLog
): Promise<Record<string, string>> => {
  const internal = { 'x-elastic-internal-origin': 'kibana', 'kbn-xsrf': 'seed' };
  const { body: loginState } = await sendJson<{
    selector?: { providers?: Array<{ type: string; name: string }> };
  }>(`${kibanaUrl}/internal/security/login_state`, 'GET', internal, undefined, []);
  const provider = loginState.selector?.providers?.find(({ type }) => type === 'basic');
  if (!provider) {
    log.warning(
      'No basic login provider: seeding with basic auth, so your browser session will not own the investigations'
    );
    return { Authorization: basicAuth(auth) };
  }

  const separator = auth.indexOf(':');
  const response = await fetch(`${kibanaUrl}/internal/security/login`, {
    method: 'POST',
    headers: { ...internal, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerType: provider.type,
      providerName: provider.name,
      currentURL: `${kibanaUrl}/login`,
      params: { username: auth.slice(0, separator), password: auth.slice(separator + 1) },
    }),
  });
  if (!response.ok) {
    throw new Error(`Login as ${auth.slice(0, separator)} failed with ${response.status}`);
  }
  const cookie = response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0])
    .join('; ');
  return { Cookie: cookie };
};

/** Kibana and Elasticsearch, as the seeding user and as kibana_system. */
class SeedClient {
  constructor(
    private readonly options: {
      kibanaUrl: string;
      esUrl: string;
      kibanaHeaders: Record<string, string>;
      kibanaSystemAuth: string;
    }
  ) {}

  /** Agent Builder and Workflows public APIs. */
  publicApi<TBody>(method: string, path: string, body?: JsonBody, okStatuses: number[] = []) {
    return sendJson<TBody>(
      `${this.options.kibanaUrl}${path}`,
      method,
      {
        ...this.options.kibanaHeaders,
        'kbn-xsrf': 'seed',
        'elastic-api-version': PUBLIC_API_VERSION,
      },
      body,
      okStatuses
    );
  }

  /** Internal routes (agentic investigations, proposals, security). */
  internalApi<TBody>(
    method: string,
    path: string,
    version: string,
    body?: JsonBody,
    okStatuses: number[] = []
  ) {
    return sendJson<TBody>(
      `${this.options.kibanaUrl}${path}`,
      method,
      {
        ...this.options.kibanaHeaders,
        'kbn-xsrf': 'seed',
        'x-elastic-internal-origin': 'kibana',
        'elastic-api-version': version,
      },
      body,
      okStatuses
    );
  }

  /** Elasticsearch as kibana_system, which owns the `.kibana-*` and `.chat-*` indexes. */
  es<TBody>(method: string, path: string, body?: JsonBody, okStatuses: number[] = []) {
    return sendJson<TBody>(
      `${this.options.esUrl}${path}`,
      method,
      { Authorization: basicAuth(this.options.kibanaSystemAuth) },
      body,
      okStatuses
    );
  }
}

/** The seeding user, shaped like the agentic investigations plugin's `resolveUser` records it. */
const resolveSeedUser = async (client: SeedClient): Promise<User> => {
  const { status, body: profile } = await client.internalApi<{
    uid?: string;
    user?: { username: string; full_name?: string | null; email?: string | null };
  }>('GET', '/internal/security/user_profile', '1', undefined, [404]);
  if (status === 200 && profile.uid && profile.user) {
    return {
      username: profile.user.username,
      fullName: profile.user.full_name ?? null,
      email: profile.user.email ?? null,
      profileUid: profile.uid,
    };
  }
  const { body: me } = await client.internalApi<{
    username: string;
    full_name?: string | null;
    email?: string | null;
    profile_uid?: string;
  }>('GET', '/internal/security/me', '1');
  return {
    username: me.username,
    fullName: me.full_name ?? null,
    email: me.email ?? null,
    ...(me.profile_uid && { profileUid: me.profile_uid }),
  };
};

/**
 * Makes sure each side index exists as the storage adapter creates it: an index template that
 * puts the alias on `<name>-*`, and the `<name>-000001` write index. Without the template, a
 * write to the alias would auto-create a plain index of that name, which then collides with the
 * adapter's alias. Same approach as the proposals Scout suite's seeding helpers.
 */
const ensureSideIndexes = async (client: SeedClient): Promise<void> => {
  for (const [name, properties] of Object.entries(SIDE_INDEX_MAPPINGS)) {
    const { status: aliasStatus } = await client.es('HEAD', `/_alias/${name}`, undefined, [404]);
    if (aliasStatus === 200) {
      continue;
    }
    const { status: templateStatus } = await client.es(
      'HEAD',
      `/_index_template/${name}`,
      undefined,
      [404]
    );
    if (templateStatus === 404) {
      await client.es('PUT', `/_index_template/${name}?create=true`, {
        index_patterns: [`${name}-*`],
        allow_auto_create: false,
        template: {
          settings: { number_of_shards: 1, auto_expand_replicas: '0-1' },
          mappings: { dynamic: 'strict', properties },
          aliases: { [name]: { is_write_index: true } },
        },
      });
    }
    // Only a concurrent create by the adapter is benign; any other 400 (e.g. a plain index that
    // already holds the alias name) must stop the seeding before it writes into the wrong index.
    const { status, body } = await client.es<{ error?: { type?: string; reason?: string } }>(
      'PUT',
      `/${name}-000001`,
      undefined,
      [400]
    );
    if (status === 400 && body.error?.type !== 'resource_already_exists_exception') {
      throw new Error(
        `Creating ${name}-000001 failed: ${body.error?.type ?? 'unknown'} ${
          body.error?.reason ?? ''
        }`
      );
    }
  }
};

const listProposals = async (
  client: SeedClient,
  conversationId: string
): Promise<ListProposalsResponse['proposals']> => {
  const { body } = await client.internalApi<ListProposalsResponse>(
    'GET',
    `${PROPOSALS_INTERNAL_URL}?conversationId=${conversationId}&size=100`,
    PROPOSALS_API_VERSION
  );
  return body.proposals;
};

const executionStatus = async (client: SeedClient, executionId: string): Promise<string> => {
  const { status, body } = await client.publicApi<{ status?: string }>(
    'GET',
    `/api/workflows/executions/${executionId}`,
    undefined,
    [404]
  );
  return status === 404 ? 'not_found' : body.status ?? 'unknown';
};

/**
 * Removes the seeded investigations: cancels the gate workflows still waiting on their proposals,
 * deletes the conversations (with their attachments), then the side-index and proposal documents.
 */
const cleanSeeds = async (client: SeedClient, log: ToolingLog): Promise<void> => {
  const conversationIds = SCENARIOS.map(seedConversationId);

  for (const conversationId of conversationIds) {
    const executions = (await listProposals(client, conversationId)).flatMap(
      ({ workflowExecutionId }) => (workflowExecutionId ? [workflowExecutionId] : [])
    );
    for (const executionId of executions) {
      if (TERMINAL_EXECUTION_STATUSES.includes(await executionStatus(client, executionId))) {
        continue;
      }
      await client.publicApi('POST', `/api/workflows/executions/${executionId}/cancel`, undefined, [
        404,
      ]);
      await waitFor(`gate workflow ${executionId} to stop`, async () => {
        const status = await executionStatus(client, executionId);
        return TERMINAL_EXECUTION_STATUSES.includes(status) || status === 'not_found'
          ? status
          : undefined;
      });
    }
    await client.publicApi(
      'DELETE',
      `/api/agent_builder/conversations/${conversationId}`,
      undefined,
      [404]
    );
  }

  for (const index of SEEDED_DOCUMENT_INDEXES) {
    await client.es(
      'POST',
      `/${index}/_delete_by_query?refresh=true&conflicts=proceed&ignore_unavailable=true`,
      {
        query: {
          bool: {
            filter: [
              { term: { spaceId: SPACE_ID } },
              { terms: { conversationId: conversationIds } },
            ],
          },
        },
      },
      [404]
    );
  }
  log.success(`Removed the ${conversationIds.length} seeded investigations`);
};

/** Indexes one side-index document and returns it with its id, as the services return it. */
const indexDocument = async <TStored extends object>(
  client: SeedClient,
  index: string,
  id: string,
  stored: TStored
): Promise<TStored & { id: string }> => {
  await client.es('PUT', `/${index}/_doc/${id}?refresh=wait_for`, stored);
  return { ...stored, id };
};

/**
 * Attaches a side-index document by reference, as `attachWithPublicClient` does: attachment id and
 * origin are the document id, the data is the document, and it is hidden from the chat.
 */
const attachDocument = async (
  client: SeedClient,
  conversationId: string,
  type: string,
  document: { id: string },
  description?: string
): Promise<void> => {
  await client.publicApi('POST', `/api/agent_builder/conversations/${conversationId}/attachments`, {
    id: document.id,
    type,
    origin: document.id,
    data: document,
    hidden: true,
    ...(description !== undefined && { description }),
  });
};

/** Starts the proposals gate workflow for each proposed action, as `proposals.create` does. */
const createProposals = async (
  client: SeedClient,
  conversationId: string,
  proposals: SeedProposal[]
): Promise<void> => {
  // One at a time, in order: the agent creates one proposal per tool call, strongest first.
  for (const { title, comment, confidence } of proposals) {
    const before = (await listProposals(client, conversationId)).length;
    await client.publicApi('POST', `/api/workflows/workflow/${CREATE_PROPOSAL_WORKFLOW_ID}/run`, {
      inputs: { conversationId, title, comment, origin: 'agent_builder', confidence },
    });
    await waitFor(`proposal "${title}"`, async () =>
      (await listProposals(client, conversationId)).length > before ? true : undefined
    );
  }
  // The gate's create step indexes the proposal, then attaches its card.
  await waitFor(`the proposal cards of ${conversationId}`, async () => {
    const { body } = await client.publicApi<{ attachments?: Array<{ type: string }> }>(
      'GET',
      `/api/agent_builder/conversations/${conversationId}`
    );
    const cards = (body.attachments ?? []).filter(({ type }) => type === PROPOSAL_ATTACHMENT_TYPE);
    return cards.length >= proposals.length ? true : undefined;
  });
};

const seedScenario = async (
  client: SeedClient,
  scenario: Scenario,
  user: User
): Promise<string> => {
  const conversationId = seedConversationId(scenario);
  const createdAt = iso(scenario.createdMinutesAgo);
  const updatedAt = iso(scenario.updatedMinutesAgo);
  const base = { spaceId: SPACE_ID, conversationId, createdAt, createdBy: user, updatedAt };

  // Agent Builder only generates a title on a round, so a seeded title is final and an omitted one
  // stays pending. Seeded open; closing is the status route's job, below.
  await client.publicApi('POST', '/api/agent_builder/conversations', {
    conversation_id: conversationId,
    agent_id: agentBuilderDefaultAgentId,
    ...(scenario.title && { title: scenario.title }),
    template_id: INVESTIGATION_TEMPLATE_ID,
    access_control: { access_mode: 'public' },
    metadata: {
      status: 'open',
      ...(scenario.severity && { severity: scenario.severity }),
      ...(scenario.summary && { summary: scenario.summary }),
      ...(scenario.verdict && { verdict: scenario.verdict }),
    },
  });

  const { subject } = scenario;
  const subjectDocument = await indexDocument<Omit<InvestigationSubject, 'id'>>(
    client,
    SUBJECT_INDEX_NAME,
    subjectDocumentId(conversationId, subject),
    {
      ...base,
      subjectType: subject.type,
      subjectId: subject.id,
      ...(subject.summary !== undefined && { summary: subject.summary }),
      triggerType: scenario.triggerType,
      ...(subject.snapshot && { snapshot: subject.snapshot }),
      ...(subject.slack && { slack: subject.slack }),
    }
  );
  await attachDocument(client, conversationId, SUBJECT_ATTACHMENT_TYPE, subjectDocument);

  if (scenario.impact) {
    const impactDocument = await indexDocument<Omit<Impact, 'id'>>(
      client,
      IMPACT_INDEX_NAME,
      impactDocumentId(conversationId),
      { ...base, ...scenario.impact }
    );
    await attachDocument(client, conversationId, IMPACT_ATTACHMENT_TYPE, impactDocument);
  }

  if (scenario.hypotheses) {
    const hypothesesDocument = await indexDocument<Omit<InvestigationHypotheses, 'id'>>(
      client,
      HYPOTHESES_INDEX_NAME,
      hypothesesDocumentId(conversationId),
      { ...base, hypotheses: scenario.hypotheses }
    );
    // `agentic_investigations.set_hypotheses` labels the attachment it adds.
    await attachDocument(
      client,
      conversationId,
      HYPOTHESES_ATTACHMENT_TYPE,
      hypothesesDocument,
      'Hypotheses'
    );
  }

  await createProposals(client, conversationId, scenario.proposals);

  if (scenario.status === 'closed') {
    await client.internalApi(
      'PUT',
      INVESTIGATION_STATUS_URL.replace('{id}', conversationId),
      AGENTIC_INVESTIGATIONS_API_VERSION,
      { status: 'closed' }
    );
  }

  // Agent Builder stamps creation and every write with the current time, and has no route to
  // set them, so the timeline is written last, to the conversation document itself.
  await client.es('POST', `/${CONVERSATIONS_INDEX}/_update/${conversationId}?refresh=wait_for`, {
    doc: { created_at: createdAt, updated_at: updatedAt },
  });

  return conversationId;
};

run(
  async ({ log, flags }) => {
    const auth = String(flags.auth);
    const kibanaUrl = await resolveKibanaUrl(String(flags['kibana-url']), auth);
    const client = new SeedClient({
      kibanaUrl,
      esUrl: String(flags['es-url']).replace(/\/$/, ''),
      kibanaHeaders: await loginHeaders(kibanaUrl, auth, log),
      kibanaSystemAuth: String(flags['kibana-system-auth']),
    });

    await cleanSeeds(client, log);
    if (flags.clean) {
      return;
    }

    const user = await resolveSeedUser(client);
    await ensureSideIndexes(client);
    for (const scenario of SCENARIOS) {
      const id = await seedScenario(client, scenario, user);
      log.info(`Seeded ${id}: ${scenario.title ?? '(untitled)'}`);
      log.info(`  ${kibanaUrl}/app/agent_builder/conversations/${id}`);
    }
    log.success(`Seeded ${SCENARIOS.length} investigations as ${user.username}`);

    const seededIds = new Set(SCENARIOS.map(seedConversationId));
    const { body } = await client.internalApi<ListInvestigationsResponse>(
      'GET',
      `${INVESTIGATIONS_INTERNAL_URL}?per_page=100`,
      AGENTIC_INVESTIGATIONS_API_VERSION
    );
    const visible = body.results.filter(({ id }) => seededIds.has(id)).length;
    log.info(`Seeded investigations listed by ${INVESTIGATIONS_INTERNAL_URL}: ${visible}`);
  },
  {
    description: `Seeds ${SCENARIOS.length} synthetic investigations: a completed alert investigation
      with impact, hypotheses, and proposed actions, a completed question, and a just-started,
      untitled alert investigation.

      Each one is an Agent Builder conversation on the investigation template with its subject,
      impact, and hypotheses documents attached by reference, and its proposed actions created
      through the proposals gate workflow. No AI connector or agent run is needed. Open the
      printed links and use "Chat info" to see the investigation overview. Re-running replaces
      the earlier seeds; --clean only removes them.`,
    flags: {
      string: ['es-url', 'kibana-url', 'auth', 'kibana-system-auth'],
      boolean: ['clean'],
      default: {
        'es-url': 'http://localhost:9200',
        'kibana-url': 'http://localhost:5601',
        auth: 'elastic:changeme',
        'kibana-system-auth': 'kibana_system:changeme',
        clean: false,
      },
      help: `
        --es-url              Elasticsearch URL (default: http://localhost:9200)
        --kibana-url          Kibana URL; the dev base path is auto-detected (default: http://localhost:5601)
        --auth                Kibana user credentials; this user owns the investigations (default: elastic:changeme)
        --kibana-system-auth  Credentials allowed to write the .kibana-* and .chat-* indexes (default: kibana_system:changeme)
        --clean               Only remove the seeded investigations
      `,
    },
  }
);
