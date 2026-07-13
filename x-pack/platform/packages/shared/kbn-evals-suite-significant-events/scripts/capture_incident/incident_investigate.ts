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

const MAX_ATTEMPTS = 4;

/** A non-empty Query DSL query object (e.g. `{ bool: … }`). */
const queryDslSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => Object.keys(value).length > 0, {
    message: 'must be a non-empty Query DSL object',
  });

// ---------------------------------------------------------------------------
// Step 1 — incident metadata (INCIDENT cluster: rootly_incidents + pagerduty)
// ---------------------------------------------------------------------------

const metadataSchema = z.object({
  title: z.string().min(1),
  publicTitle: z.string().optional(),
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
  severity: z.string().optional(),
  status: z.string().optional(),
  // Enrichment/context for step 2 only (not used to build the config), so keep it
  // optional — a partial timeline should not fail the whole extraction.
  timeline: z
    .object({
      started: z.string().optional(),
      detected: z.string().optional(),
      mitigated: z.string().optional(),
      resolved: z.string().optional(),
    })
    .optional(),
  cloud: z.string().optional(),
  region: z.string().optional(),
  environments: z.array(z.string()).default([]),
  productsImpacted: z.array(z.string()).default([]),
  customerImpact: z.string().optional(),
  // Affected services (rootly.services.name) + the causal service + root-cause
  // categories — these narrow WHERE to look in the logs.
  services: z.array(z.string()).default([]),
  causalService: z.string().optional(),
  causes: z.array(z.string()).default([]),
  reportingSource: z.string().optional(),
  // Free-text narratives — the richest source of literal error strings. Optional
  // so a response that captured error signatures but omitted the prose summary is
  // still usable.
  summary: z.string().optional(),
  mitigationMessage: z.string().optional(),
  resolutionMessage: z.string().optional(),
  // The PagerDuty alert that fired — `firstTriggerLogEntrySummary` is often the
  // exact error text.
  pagerduty: z
    .object({
      title: z.string().optional(),
      serviceSummary: z.string().optional(),
      firstTriggerLogEntrySummary: z.string().optional(),
    })
    .optional(),
  // The literal error tokens / status codes / exception names extracted VERBATIM
  // from the narratives + PD alert. Highest-value input for locating the symptom.
  errorSignatures: z.array(z.string()).default([]),
  // Candidate log data streams mapped from the affected services (hints only; the
  // logs cluster may name datasets differently, so Step 2 verifies them).
  datasetHints: z.array(z.string()).default([]),
  slackChannel: z.string().optional(),
  links: z
    .object({
      rcaUrl: z.string().optional(),
      slackChannel: z.string().optional(),
      jiraUrl: z.string().optional(),
      pagerdutyUrl: z.string().optional(),
    })
    .default({}),
});

export type IncidentMetadata = z.infer<typeof metadataSchema>;

// ---------------------------------------------------------------------------
// Step 2 — log-grounded derivation (LOGS cluster: verify against real logs)
// ---------------------------------------------------------------------------

// The full derivation is produced in TWO smaller agent rounds (remote, then symptom)
// so each round concludes within its tool budget instead of exhausting it and ending
// empty. This is the shape the orchestrator consumes.
const derivationSchema = z.object({
  // The CCS remote cluster alias that actually holds these logs, verified by query.
  remoteCluster: z.string().min(1),
  searchWindow: z.object({
    gte: z.string().min(1),
    lt: z.string().min(1),
  }),
  // Structured bool symptom, VERIFIED to match an incident-clustered set.
  symptom: queryDslSchema,
  // The broad entity field that keys the symptom.
  entityField: z.string().min(1),
});

export type LogDerivation = z.infer<typeof derivationSchema>;

// Phase 1 — just the remote cluster.
const remoteSchema = z.object({
  remoteCluster: z.string().min(1),
});

// Phase 2 — the symptom / entity / window (the remote is already fixed).
const symptomSchema = z.object({
  searchWindow: z.object({
    gte: z.string().min(1),
    lt: z.string().min(1),
  }),
  symptom: queryDslSchema,
  entityField: z.string().min(1),
});

const REMOTE_RULES = `You are on the LOGS cluster — a Cross-Cluster-Search hub over MANY remotes named like "logging-<region>" and "serverless-logging-<region>". You are given the FACTS about an incident (below). Your ONLY job in this step is to identify WHICH remote cluster holds the affected services' logs.

Use the incident region + services + datasetHints to target 1-2 candidate remotes, then run AT MOST 2-3 quick queries (e.g. a count over the incident timeline on FROM <remote>:logs-* filtered by an error signature or service) to confirm the incident's logs are there. Then STOP and return the exact FULL alias.

CRITICAL: the alias MUST include the region (e.g. "serverless-logging-us-east-1" or "logging-ap-southeast-2"). NEVER return a region-less alias like "serverless-logging-aws". Keep tool use minimal; your FINAL message MUST be ONLY this fenced JSON block:

\`\`\`json
{ "remoteCluster": "logging-<region>" }
\`\`\``;

const buildSymptomRules = (remoteCluster: string): string =>
  `You are on the LOGS cluster. The incident's logs live on remote cluster "${remoteCluster}" — query them with FROM ${remoteCluster}:logs-*. You are given the FACTS about an incident (below). Derive and VERIFY the symptom, entityField, and searchWindow against the REAL logs on that remote. Do not guess — confirm each with a query.

symptom: a STRUCTURED bool query — NEVER a query_string. Build it ONLY from literal ERROR text — exception names, error phrases, status codes, failure keywords (e.g. "ImagePullBackOff", "failed to pull image", "short read"). NEVER use a component / service / deployment / pod / container / provisioner NAME as a token (e.g. "topolvm-provisioner"): those appear in cost, network, autoscaler, etc. logs across MANY datasets and will match unrelated noise. A correct symptom is CONCENTRATED — its hits sit in ONE or a FEW datasets. VERIFY this: aggregate your candidate symptom by data_stream.dataset; if it matches many datasets each at low density, you included a non-error token — DROP it and re-verify. Build with:
  - match_phrase on "message" for each literal error token (primary anchor);
  - term on a keyword field (e.g. { "term": { "log.level": "ERROR" } }) and prefix on log.logger ONLY when you confirmed that field is populated on these logs;
  combined in a bool: required -> "filter" (AND), any-of alternatives -> "should" + "minimum_should_match": 1.
  VERIFY it: run it over the timeline and confirm it matches an incident-CLUSTERED set (tens to low thousands, concentrated during the incident). If it matches 0, adjust the tokens to the REAL log text you see (the docs' wording may differ from the summary). If it matches fleet-wide millions, tighten (drop over-broad tokens; never include high-cardinality ids). Do NOT include a @timestamp range in the symptom.

entityField: the field that best identifies the affected entity AND keys the symptom dataset — confirm via a STATS/terms on the symptom hits. Prefer a broad, stable key ("serverless.project.id" or "kubernetes.namespace"); use "kubernetes.pod.name" or "host.name" for pod/node-level infra incidents. Return the FIELD only (the tool discovers the values).

searchWindow: a WIDE ISO-8601 UTC window that certainly brackets all symptom logs (pad the incident timeline generously, e.g. a day before started and a day after resolved).

TOOL BUDGET — CRITICAL: about 6 tool calls. Spend ~4 to build+verify the symptom and ~1 STATS to confirm the entityField, then STOP and emit the JSON with your best VERIFIED values (an approximate-but-grounded answer beats none). Your FINAL message MUST be ONLY this fenced JSON block — never end on a tool call or prose:

\`\`\`json
{
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
function extractJsonCandidates(message: string): string[] {
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
 * with a firmer corrective turn (same conversation) when the JSON is missing or
 * does not match.
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

  // Each attempt is a FRESH, self-contained conversation. We do NOT thread the
  // conversation id across attempts: on the logs cluster reusing it fails with
  // "Conversation not found" (API-key sessions don't reliably persist it), and a
  // stateless retry that restates the whole task is more robust anyway.
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const correction =
      attempt === 1
        ? ''
        : `\n\n---\nA previous attempt FAILED: ${lastError}\nMost likely you spent your whole tool budget exploring and never answered. This time keep tool use MINIMAL — at most ~3 targeted queries — then STOP and output the answer. Your reply MUST END with ONLY one fenced \`\`\`json code block matching the required shape; producing that JSON is more important than further verification. Use the REAL values you found via the tools (an approximate but grounded answer NOW beats none) — never blank fields or placeholders like "unknown", "N/A", or an echo of the incident id. Include every required field and format dates as noted.`;
    const input = `${systemRules}\n\n${firstInput}${correction}`;

    log.info(`${label} (attempt ${attempt}/${MAX_ATTEMPTS})…`);
    let turn;
    try {
      turn = await agentClient.converse({ input });
    } catch (error) {
      // A round can fail transiently (cluster TLS/handshake timeouts, dropped
      // stream). Treat it as a failed attempt and retry rather than aborting.
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
// Public API
// ---------------------------------------------------------------------------

/**
 * Reads a value at a dotted path, tolerating BOTH nested objects and flat dotted
 * keys in `_source` (we don't know which the rootly ingestion used), e.g.
 * `{ rootly: { title } }` and `{ 'rootly.title': … }` both resolve `rootly.title`.
 */
function getField(source: Record<string, unknown>, path: string): unknown {
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
function firstString(source: Record<string, unknown>, ...paths: string[]): string | undefined {
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

/** Collects `name`s from a value that may be a string, an array of strings, or an array of `{ name }`. */
function collectNames(value: unknown): string[] {
  const items = Array.isArray(value) ? value : value == null ? [] : [value];
  const names = items
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }
      if (item && typeof item === 'object') {
        const name = (item as Record<string, unknown>).name;
        return typeof name === 'string' ? name.trim() : undefined;
      }
      return undefined;
    })
    .filter((name): name is string => Boolean(name));
  return [...new Set(names)];
}

/** First non-empty name list across the given candidate paths. */
function namesFrom(source: Record<string, unknown>, ...paths: string[]): string[] {
  for (const path of paths) {
    const names = collectNames(getField(source, path));
    if (names.length > 0) {
      return names;
    }
  }
  return [];
}

// Cloud tokens used to split a `<cloud>.<region>` value (e.g. `aws.ap-southeast-2`)
// into a bare region (what step 2 keys the remote on) + a cloud label.
const CLOUD_TOKENS = new Set(['aws', 'gcp', 'azure', 'ibm']);

/**
 * Extracts the human values from a Rootly CUSTOM FORM FIELD. These are stored as
 * an array of objects that carry the value under `value`, or nested under one of
 * the `selected_*` arrays (`selected_options`, `selected_services`, …), e.g.
 * `rootly.region[].selected_options[].value = "aws.ap-southeast-2"` or
 * `rootly.causal-service[].selected_services[].name = "Docker Registry"`. Returns
 * every distinct value/name found, in document order.
 */
function formFieldValues(node: unknown): string[] {
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

/**
 * Step 1: read the incident FACTS directly from the INCIDENT cluster's
 * Elasticsearch (`rootly_incidents` + `pagerduty_incidents`) — no Agent Builder.
 * Every field the old converse path returned is a raw document field, so reading
 * them is deterministic and cheaper. The date (which anchors the whole capture
 * window) comes straight from the incident's `started_at`/`created_at`, which is
 * exactly what the old path had to override the LLM for. `errorSignatures` /
 * `datasetHints` are intentionally left empty: the logs-cluster agent (step 2)
 * extracts + VERIFIES error tokens from the raw narratives against the real logs.
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

  // Region is a custom form field, e.g. `aws.ap-southeast-2`. Split the leading
  // cloud token off so `region` is the bare `ap-southeast-2` that step 2 keys the
  // remote on (`serverless-logging-<region>`), and surface the cloud separately.
  const regionRaw = formFieldFirst(rootly, 'rootly.region');
  let region = regionRaw;
  let cloud: string | undefined;
  if (regionRaw && regionRaw.includes('.')) {
    const [head, ...rest] = regionRaw.split('.');
    if (CLOUD_TOKENS.has(head.toLowerCase())) {
      cloud = head.toLowerCase();
      region = rest.join('.');
    }
  }
  // Fall back to the CSP name (`rootly.environments[].name` = "AWS") for cloud.
  if (!cloud) {
    const csp = namesFrom(rootly, 'rootly.environments.name', 'rootly.environments')[0];
    if (csp && CLOUD_TOKENS.has(csp.toLowerCase())) {
      cloud = csp.toLowerCase();
    }
  }

  const raw: Record<string, unknown> = {
    title: firstString(rootly, 'rootly.title', 'rootly.public_title') ?? `incident-${incidentId}`,
    publicTitle: firstString(rootly, 'rootly.public_title'),
    // Deterministic date from the real incident timestamp (the schema trims it to
    // YYYY-MM-DD). A wrong year here makes the symptom match 0 logs.
    date: started ?? firstString(rootly, 'rootly.date') ?? '',
    // Severity is a nested relationship document: rootly.severity.data.attributes.name.
    severity: firstString(
      rootly,
      'rootly.severity.data.attributes.name',
      'rootly.severity.data.attributes.severity'
    ),
    status: firstString(rootly, 'rootly.status'),
    timeline: {
      started,
      detected: firstString(rootly, 'rootly.detected_at'),
      mitigated: firstString(rootly, 'rootly.mitigated_at', 'rootly.acknowledged_at'),
      resolved: firstString(rootly, 'rootly.resolved_at'),
    },
    cloud,
    region,
    // Real environment ("Production") is the `environment` custom field; the
    // `environments[]` relationship is the CSP (AWS), used for `cloud` above.
    environments: formFieldValues(getField(rootly, 'rootly.environment')),
    productsImpacted: formFieldValues(getField(rootly, 'rootly.product-s-impacted')),
    customerImpact: formFieldFirst(rootly, 'rootly.customer-impact'),
    // No top-level services relationship; the causal service ("Docker Registry")
    // is the strongest WHERE-to-look signal.
    services: formFieldValues(getField(rootly, 'rootly.causal-service')),
    causalService: formFieldFirst(rootly, 'rootly.causal-service'),
    causes: namesFrom(rootly, 'rootly.causes.name', 'rootly.causes'),
    reportingSource:
      formFieldFirst(rootly, 'rootly.reporting-source') ?? firstString(rootly, 'rootly.source'),
    summary: firstString(rootly, 'rootly.summary'),
    mitigationMessage: firstString(rootly, 'rootly.mitigation_message'),
    resolutionMessage: firstString(rootly, 'rootly.resolution_message'),
    slackChannel: firstString(rootly, 'rootly.slack_channel_name'),
    links: {
      rcaUrl: firstString(rootly, 'rootly.google_drive_url'),
      slackChannel: firstString(
        rootly,
        'rootly.slack_channel_url',
        'rootly.slack_channel_short_url'
      ),
      jiraUrl: firstString(rootly, 'rootly.jira_issue_url'),
      pagerdutyUrl: firstString(rootly, 'rootly.pagerduty_incident_url'),
    },
    ...(pagerduty
      ? {
          pagerduty: {
            title: firstString(pagerduty, 'pagerduty.description', 'pagerduty.summary'),
            serviceSummary: firstString(pagerduty, 'pagerduty.service.summary'),
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

/** Step 2: derive + verify the symptom / remote / entity on the LOGS cluster's Agent Builder. */
export async function deriveSymptomFromLogs({
  agentClient,
  metadata,
  log,
  feedback,
}: {
  agentClient: IncidentAgentClient;
  metadata: IncidentMetadata;
  log: ToolingLog;
  /** Optional corrective note appended when re-deriving after a too-broad symptom. */
  feedback?: string;
}): Promise<LogDerivation> {
  const factsBlock = `Incident facts (JSON):\n\`\`\`json\n${JSON.stringify(
    metadata,
    null,
    2
  )}\n\`\`\``;

  // Phase 1 — locate the remote cluster (small round, concludes reliably).
  const { remoteCluster } = await converseForJson({
    agentClient,
    schema: remoteSchema,
    systemRules: REMOTE_RULES,
    firstInput: `${factsBlock}\n\nIdentify the remote cluster that holds these logs.`,
    label: `Locating remote for "${metadata.title}" (logs cluster)`,
    log,
  });
  log.info(`Remote located: ${remoteCluster}`);

  // Phase 2 — build + verify the symptom / entity / window on that remote.
  const rest = await converseForJson({
    agentClient,
    schema: symptomSchema,
    systemRules: buildSymptomRules(remoteCluster),
    firstInput: `${factsBlock}\n\nDerive and VERIFY the symptom, entityField, and searchWindow against FROM ${remoteCluster}:logs-*.${
      feedback ? `\n\n${feedback}` : ''
    }`,
    label: `Deriving symptom for "${metadata.title}" on ${remoteCluster}`,
    log,
  });

  const derivation: LogDerivation = { remoteCluster, ...rest };
  log.info(
    `Log-grounded derivation: remote=${derivation.remoteCluster}, entity=${derivation.entityField}, ` +
      `search window ${derivation.searchWindow.gte}..${derivation.searchWindow.lt}`
  );
  return derivation;
}
