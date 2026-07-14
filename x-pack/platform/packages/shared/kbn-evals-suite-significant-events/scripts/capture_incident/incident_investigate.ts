/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { z } from '@kbn/zod';
import type { IncidentAgentClient } from './incident_agent_client';
import type { IncidentMetadataClient } from './incident_metadata_client';

// One derivation round can fail transiently or return no JSON; a single retry
// absorbs the common case without the elaborate multi-attempt tool-budget prose.
const MAX_ATTEMPTS = 2;

/** A non-empty Query DSL query object (e.g. `{ bool: … }`). */
const queryDslSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => Object.keys(value).length > 0, {
    message: 'must be a non-empty Query DSL object',
  });

// ---------------------------------------------------------------------------
// Step 1 — incident metadata (INCIDENT cluster: rootly_incidents + pagerduty)
// ---------------------------------------------------------------------------

// Only `title` / `date` / `slackChannel` feed the config; the remaining fields are
// context handed verbatim to the logs-cluster agent (step 2) to derive the symptom.
const metadataSchema = z.object({
  title: z.string().min(1),
  // Incident start date as YYYY-MM-DD. `rootly.started_at` is a full ISO datetime
  // (with offset), so accept that and keep the date portion.
  date: z
    .string()
    .min(1)
    .transform((value) => value.trim().slice(0, 10))
    .refine(
      (value) => /^\d{4}-\d{2}-\d{2}$/.test(value),
      'date must be (or start with) YYYY-MM-DD'
    ),
  slackChannel: z.string().optional(),
  // The incident region may be cloud-prefixed (e.g. `aws.ap-southeast-2`); handed
  // to the agent RAW so it resolves the bare region + remote alias itself.
  region: z.string().optional(),
  cloud: z.string().optional(),
  // Affected / causal services narrow WHERE to look in the logs.
  services: z.array(z.string()).default([]),
  // Free-text narrative + the PagerDuty alert text — the richest sources of the
  // literal error strings the symptom is built from.
  summary: z.string().optional(),
  pagerduty: z
    .object({
      title: z.string().optional(),
      firstTriggerLogEntrySummary: z.string().optional(),
    })
    .optional(),
});

export type IncidentMetadata = z.infer<typeof metadataSchema>;

// ---------------------------------------------------------------------------
// Step 2 — log-grounded derivation (LOGS cluster: verify against real logs)
// ---------------------------------------------------------------------------

const derivationSchema = z.object({
  // The CCS remote cluster alias that actually holds these logs (verified by query).
  remoteCluster: z.string().min(1),
  searchWindow: z.object({
    gte: z.string().min(1),
    lt: z.string().min(1),
  }),
  // Structured bool symptom built from literal error text, verified concentrated.
  symptom: queryDslSchema,
  // The broad entity field that keys the symptom.
  entityField: z.string().min(1),
});

export type LogDerivation = z.infer<typeof derivationSchema>;

/**
 * Single-round rules for the logs-cluster agent: locate the remote, then build +
 * verify the symptom / entityField / searchWindow against the REAL logs on it. The
 * live remote aliases (when known) are listed so the agent returns one verbatim.
 *
 * Note: this is a single round (simpler than the old two-phase split); the
 * `MAX_ATTEMPTS` retry absorbs the occasional empty round the split used to avoid.
 */
const buildDerivationRules = (remotes: string[]): string =>
  `You are on the LOGS cluster — a Cross-Cluster-Search hub over MANY remotes named like "logging-<region>" and "serverless-logging-<region>". You are given the FACTS about an incident (below). Query a remote with FROM <remote>:logs-*. Do NOT guess — confirm each value with a query. Keep tool use MINIMAL (about 6 calls total), then STOP and emit the JSON.

remoteCluster: the remote that holds the affected services' logs.${
    remotes.length > 0
      ? `\n  The LIVE remote aliases are:\n${remotes
          .map((remote) => `    - ${remote}`)
          .join('\n')}\n  Return EXACTLY one of these.`
      : ''
  }
  The incident "region" may be cloud-prefixed (e.g. "aws.ap-southeast-2" = cloud "aws", region "ap-southeast-2"); the alias uses the BARE region ("serverless-logging-ap-southeast-2"). It MUST include the region — never a region-less alias like "serverless-logging-aws". Confirm the logs are there with 1-2 quick counts.

symptom: a STRUCTURED bool query — NEVER a query_string. Build it ONLY from literal ERROR text — exception names, error phrases, status codes, failure keywords (e.g. "ImagePullBackOff", "failed to pull image"). NEVER use a component / service / pod / container NAME as a token: those appear across MANY datasets and match unrelated noise. A correct symptom is CONCENTRATED — its hits sit in ONE or a FEW datasets. VERIFY: aggregate by data_stream.dataset; if it spreads across many datasets at low density, drop the offending token and re-verify. Build with match_phrase on "message" per error token, optionally a term on a keyword field (e.g. { "term": { "log.level": "ERROR" } }) you confirmed is populated, combined in a bool (required -> "filter", alternatives -> "should" + "minimum_should_match": 1). Confirm it matches an incident-CLUSTERED set (tens to low thousands during the incident). Do NOT include a @timestamp range.

entityField: the field that best identifies the affected entity AND keys the symptom dataset — confirm via a terms agg on the symptom hits. Prefer a broad, stable key ("serverless.project.id" or "kubernetes.namespace"); use "kubernetes.pod.name" or "host.name" for pod/node-level infra incidents. Return the FIELD name only.

searchWindow: a WIDE ISO-8601 UTC window that certainly brackets all symptom logs (pad the incident date generously — a day before and after).

Your FINAL message MUST be ONLY this fenced JSON block — never end on a tool call or prose:

\`\`\`json
{
  "remoteCluster": "logging-<region>",
  "searchWindow": { "gte": "ISO", "lt": "ISO" },
  "symptom": { "bool": { "should": [ { "match_phrase": { "message": "<literal token>" } } ], "minimum_should_match": 1 } },
  "entityField": "serverless.project.id"
}
\`\`\``;

// ---------------------------------------------------------------------------
// Shared conversation runner
// ---------------------------------------------------------------------------

/**
 * Extracts candidate JSON strings from an agent message, best-first: every fenced
 * \`\`\`json block in REVERSE order (the final answer is usually the last block,
 * after any "thinking out loud" / example snippets), then the widest balanced
 * `{…}` span as a last resort.
 */
export function extractJsonCandidates(message: string): string[] {
  const fenced: string[] = [];
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(message)) !== null) {
    if (match[1]?.trim()) {
      fenced.push(match[1].trim());
    }
  }
  const candidates = fenced.reverse();
  const start = message.indexOf('{');
  const end = message.lastIndexOf('}');
  if (start >= 0 && end > start) {
    candidates.push(message.slice(start, end + 1).trim());
  }
  return candidates;
}

function parseAgainst<T>(
  message: string,
  schema: z.ZodType<T>
): { ok: true; value: T } | { ok: false; error: string } {
  const candidates = extractJsonCandidates(message);
  if (candidates.length === 0) {
    return { ok: false, error: 'No JSON object found in the response.' };
  }
  let lastError = 'No JSON block matched the required shape.';
  for (const json of candidates) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      lastError = 'A JSON block failed to parse.';
      continue;
    }
    const result = schema.safeParse(parsed);
    if (result.success) {
      return { ok: true, value: result.data };
    }
    lastError = `JSON did not match the required shape:\n${result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')}`;
  }
  return { ok: false, error: lastError };
}

/**
 * Drives one Agent Builder conversation to a schema-valid JSON result, retrying
 * once (a fresh, self-contained conversation) when the JSON is missing or does not
 * match. We do NOT thread the conversation id across attempts — on the logs cluster
 * reusing it fails with "Conversation not found", and a stateless retry is simpler.
 */
async function converseForJson<T>({
  agentClient,
  schema,
  systemRules,
  firstInput,
  label,
  log,
}: {
  agentClient: IncidentAgentClient;
  schema: z.ZodType<T>;
  systemRules: string;
  firstInput: string;
  label: string;
  log: ToolingLog;
}): Promise<T> {
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const correction =
      attempt === 1
        ? ''
        : `\n\n---\nA previous attempt FAILED: ${lastError}\nReturn ONLY one fenced \`\`\`json block matching the required shape, using the REAL values you found (never blanks or placeholders).`;
    const input = `${systemRules}\n\n${firstInput}${correction}`;

    log.info(`${label} (attempt ${attempt}/${MAX_ATTEMPTS})…`);
    let turn;
    try {
      turn = await agentClient.converse({ input });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      log.warning(`Attempt ${attempt} errored: ${lastError}`);
      continue;
    }

    const parsed = parseAgainst(turn.message, schema);
    if (parsed.ok) {
      return parsed.value;
    }
    lastError = parsed.error;
    log.warning(`Attempt ${attempt} unusable: ${lastError}`);
    log.debug(
      `Raw agent message (${turn.message.length} chars, ${
        turn.steps.length
      } steps): ${JSON.stringify(turn.message.slice(0, 800))}`
    );
  }

  throw new Error(
    `${label}: no usable response after ${MAX_ATTEMPTS} attempts. Last error:\n${lastError}`
  );
}

// ---------------------------------------------------------------------------
// Rootly document helpers
// ---------------------------------------------------------------------------

/**
 * Reads a value at a dotted path, tolerating BOTH nested objects and flat dotted
 * keys in `_source` (we don't know which the rootly ingestion used), e.g.
 * `{ rootly: { title } }` and `{ 'rootly.title': … }` both resolve `rootly.title`.
 */
export function getField(source: Record<string, unknown>, path: string): unknown {
  if (path in source) {
    return source[path];
  }
  const parts = path.split('.');
  let current: unknown = source;
  for (let index = 0; index < parts.length; index++) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    const record = current as Record<string, unknown>;
    const remaining = parts.slice(index).join('.');
    if (remaining in record) {
      return record[remaining];
    }
    current = record[parts[index]];
  }
  return current;
}

/** First non-empty string across the given candidate paths (unwrapping single-value arrays). */
export function firstString(
  source: Record<string, unknown>,
  ...paths: string[]
): string | undefined {
  for (const path of paths) {
    const value = getField(source, path);
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    if (Array.isArray(value)) {
      const hit = value.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
      if (typeof hit === 'string') {
        return hit.trim();
      }
    }
  }
  return undefined;
}

/**
 * Extracts the human values from a Rootly CUSTOM FORM FIELD. These are stored as
 * an array of objects that carry the value under `value`, or nested under one of
 * the `selected_*` arrays (`selected_options`, `selected_services`, …), e.g.
 * `rootly.region[].selected_options[].value = "aws.ap-southeast-2"` or
 * `rootly.causal-service[].selected_services[].name = "Docker Registry"`. Returns
 * every distinct value/name found, in document order.
 */
export function formFieldValues(node: unknown): string[] {
  const items = Array.isArray(node) ? node : node == null ? [] : [node];
  const out: string[] = [];
  const push = (value: unknown): void => {
    if (typeof value === 'string' && value.trim().length > 0) {
      out.push(value.trim());
    }
  };
  const selectedKeys = [
    'selected_options',
    'selected_services',
    'selected_functionalities',
    'selected_groups',
    'selected_catalog_entities',
    'selected_users',
  ];
  for (const item of items) {
    if (typeof item === 'string') {
      push(item);
      continue;
    }
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    push(record.value);
    push(record.name);
    for (const key of selectedKeys) {
      const sub = record[key];
      if (Array.isArray(sub)) {
        for (const entry of sub) {
          if (entry && typeof entry === 'object') {
            push((entry as Record<string, unknown>).value);
            push((entry as Record<string, unknown>).name);
          }
        }
      }
    }
  }
  return [...new Set(out)];
}

/** First value of the Rootly custom form field at `path`. */
function formFieldFirst(source: Record<string, unknown>, path: string): string | undefined {
  return formFieldValues(getField(source, path))[0];
}

/** Fetches the incident document from `rootly_incidents` (or its staging index) by sequential id. */
async function fetchRootlyIncident({
  client,
  incidentId,
}: {
  client: IncidentMetadataClient;
  incidentId: string;
}): Promise<Record<string, unknown>> {
  const sequentialId = Number(incidentId);
  const idValue = Number.isInteger(sequentialId) ? sequentialId : incidentId;
  const sources = await client.search('rootly_incidents,rootly_incidents-staging-001', {
    size: 1,
    query: { term: { 'rootly.sequential_id': idValue } },
  });
  const rootly = sources[0];
  if (!rootly) {
    throw new Error(
      `Incident ${incidentId} not found in rootly_incidents (searched by rootly.sequential_id). ` +
        `Verify the id and that INCIDENT_KIBANA_API_KEY can read that index on the incident cluster.`
    );
  }
  return rootly;
}

/**
 * Best-effort cross-reference into `pagerduty_incidents` via the rootly incident's
 * `pagerduty_incident_id`. The PD alert text is often the exact error, but it is
 * enrichment only — any failure or miss just drops the `pagerduty` block.
 */
async function fetchPagerdutyIncident({
  client,
  rootly,
  log,
}: {
  client: IncidentMetadataClient;
  rootly: Record<string, unknown>;
  log: ToolingLog;
}): Promise<Record<string, unknown> | undefined> {
  // The reliable join is the numeric `pagerduty.incident_number` (== rootly's
  // `pagerduty_incident_number`). The string `pagerduty.id` is analyzed text, so a
  // `term` misses it — use `match` for that fallback. `should` tries both.
  const incidentNumber = getField(rootly, 'rootly.pagerduty_incident_number');
  const pdId = firstString(rootly, 'rootly.pagerduty_incident_id');
  const should: Array<Record<string, unknown>> = [];
  if (typeof incidentNumber === 'number') {
    should.push({ term: { 'pagerduty.incident_number': incidentNumber } });
  }
  if (pdId) {
    should.push({ match: { 'pagerduty.id': pdId } });
  }
  if (should.length === 0) {
    return undefined;
  }

  try {
    const sources = await client.search('pagerduty_incidents', {
      size: 1,
      query: { bool: { should, minimum_should_match: 1 } },
    });
    if (sources[0]) {
      return sources[0];
    }
    log.debug(`No pagerduty_incidents document matched incident_number=${String(incidentNumber)}.`);
  } catch (error) {
    log.warning(
      `Could not read pagerduty_incidents (${
        error instanceof Error ? error.message : String(error)
      }); continuing without PagerDuty enrichment.`
    );
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Step 1: read the incident FACTS directly from the INCIDENT cluster's
 * Elasticsearch (`rootly_incidents` + `pagerduty_incidents`) — no Agent Builder.
 * Every field is a raw document field, so reading them is deterministic and cheap.
 * The date (which anchors the whole capture window) comes straight from the
 * incident's `started_at`/`created_at`. The logs-cluster agent (step 2) extracts +
 * VERIFIES error tokens from the raw narratives against the real logs.
 */
export async function investigateIncidentMetadata({
  client,
  incidentId,
  log,
}: {
  client: IncidentMetadataClient;
  incidentId: string;
  log: ToolingLog;
}): Promise<IncidentMetadata> {
  const rootly = await fetchRootlyIncident({ client, incidentId });
  const pagerduty = await fetchPagerdutyIncident({ client, rootly, log });

  const started = firstString(rootly, 'rootly.started_at', 'rootly.created_at');

  const raw: Record<string, unknown> = {
    title: firstString(rootly, 'rootly.title', 'rootly.public_title') ?? `incident-${incidentId}`,
    // Deterministic date from the real incident timestamp (the schema trims it to
    // YYYY-MM-DD). A wrong year here makes the symptom match 0 logs.
    date: started ?? firstString(rootly, 'rootly.date') ?? '',
    slackChannel: firstString(rootly, 'rootly.slack_channel_name'),
    // Region custom field verbatim (may be cloud-prefixed); cloud = CSP name hint.
    region: formFieldFirst(rootly, 'rootly.region'),
    cloud: formFieldFirst(rootly, 'rootly.environments'),
    // Causal service ("Docker Registry") is the strongest WHERE-to-look signal.
    services: formFieldValues(getField(rootly, 'rootly.causal-service')),
    summary: firstString(rootly, 'rootly.summary'),
    ...(pagerduty
      ? {
          pagerduty: {
            title: firstString(pagerduty, 'pagerduty.description', 'pagerduty.summary'),
            firstTriggerLogEntrySummary: firstString(
              pagerduty,
              'pagerduty.first_trigger_log_entry.summary'
            ),
          },
        }
      : {}),
  };

  const result = metadataSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Could not assemble usable metadata for incident ${incidentId} from rootly_incidents ` +
        `(missing title or a valid start date?):\n${issues}`
    );
  }
  const metadata = result.data;

  log.info(
    `Incident metadata: "${metadata.title}" (${metadata.date}), region=${
      metadata.region ?? 'n/a'
    }, services=[${metadata.services.join(', ')}]${pagerduty ? ', +pagerduty' : ''}.`
  );
  return metadata;
}

/** Step 2: derive + verify the symptom / remote / entity / window on the LOGS cluster's Agent Builder. */
export async function deriveSymptomFromLogs({
  agentClient,
  metadata,
  log,
  remotes = [],
}: {
  agentClient: IncidentAgentClient;
  metadata: IncidentMetadata;
  log: ToolingLog;
  /** Live remote aliases of the Overview source, listed for the agent to pick from. */
  remotes?: string[];
}): Promise<LogDerivation> {
  const factsBlock = `Incident facts (JSON):\n\`\`\`json\n${JSON.stringify(
    metadata,
    null,
    2
  )}\n\`\`\``;

  const derivation = await converseForJson({
    agentClient,
    schema: derivationSchema,
    systemRules: buildDerivationRules(remotes),
    firstInput: `${factsBlock}\n\nDerive and VERIFY the remoteCluster, symptom, entityField, and searchWindow.`,
    label: `Deriving symptom for "${metadata.title}" (logs cluster)`,
    log,
  });

  log.info(
    `Log-grounded derivation: remote=${derivation.remoteCluster}, entity=${derivation.entityField}, ` +
      `search window ${derivation.searchWindow.gte}..${derivation.searchWindow.lt}`
  );
  return derivation;
}
