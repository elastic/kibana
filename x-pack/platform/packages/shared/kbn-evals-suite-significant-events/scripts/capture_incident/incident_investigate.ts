/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { z } from '@kbn/zod';
import type { IncidentAgentClient } from './incident_agent_client';

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
  // Incident start date as YYYY-MM-DD. Models often return a full ISO datetime, so
  // accept that and keep the date portion rather than rejecting real data.
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

const METADATA_RULES = `You are gathering the FACTS about a production incident so a second agent (on the logs cluster) can locate its symptom in the real logs. Return facts only — do NOT build any query.

Use your tools:
- Read rootly_incidents by rootly.sequential_id: title/public_title, status, severity, the full timeline (created/started/detected/mitigated/resolved), the narratives (summary, mitigation_message, resolution_message), customer impact, products, environments, region, services (names) + causal-service, causes (root-cause categories), reporting-source, slack channel, and the external links (google_drive RCA, jira, pagerduty, slack).
- Cross-reference pagerduty_incidents via rootly.pagerduty_incident_id: the PD title, service summary, and especially first_trigger_log_entry.summary (the alert text — often the exact error).

Then produce:
- errorSignatures: the LITERAL error strings / status codes / exception names / camelCase state identifiers that appear in the narratives and the PD alert, copied VERBATIM (e.g. "ImagePullBackOff", "circuit_breaking_exception", "502 Bad Gateway"). Do NOT paraphrase the summary; extract the real tokens. Omit high-cardinality ids (project/request/trace id). Do NOT include component / service / deployment / pod / container / provisioner NAMES (e.g. "topolvm-provisioner", "api-gateway") — those appear in many unrelated logs and are NOT error signatures.
- datasetHints: candidate log data streams for the affected services (e.g. api-gateway -> "logs-api-gateway*", an Elasticsearch/Kibana cluster -> "cluster-*-filebeat*" or "logs-elasticsearch.*"). Best-effort; the logs cluster verifies them.
- DATES ARE CRITICAL and must be COPIED VERBATIM from the document — never infer, approximate, or guess a year. Read rootly.started_at (fall back to rootly.created_at) and copy it EXACTLY into timeline.started (ISO-8601 UTC). Set "date" to the first 10 characters of that SAME timestamp (YYYY-MM-DD). Copy detected/mitigated/resolved verbatim from their rootly fields. If a timestamp field is absent, omit it — do NOT fabricate one. A wrong date makes the whole capture miss the logs.

Respond with ONLY a single fenced JSON code block matching this shape (omit unknown optional fields):

\`\`\`json
{
  "title": "string",
  "date": "YYYY-MM-DD",
  "severity": "SEV2",
  "status": "resolved",
  "timeline": { "started": "ISO", "detected": "ISO", "mitigated": "ISO", "resolved": "ISO" },
  "cloud": "aws", "region": "ap-southeast-2",
  "environments": ["production"], "productsImpacted": ["..."], "customerImpact": "...",
  "services": ["..."], "causalService": "...", "causes": ["..."], "reportingSource": "...",
  "summary": "...", "mitigationMessage": "...", "resolutionMessage": "...",
  "pagerduty": { "title": "...", "serviceSummary": "...", "firstTriggerLogEntrySummary": "..." },
  "errorSignatures": ["...", "..."],
  "datasetHints": ["logs-...*"],
  "slackChannel": "#incident-...",
  "links": { "rcaUrl": "...", "slackChannel": "...", "jiraUrl": "...", "pagerdutyUrl": "..." }
}
\`\`\``;

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

/** Step 1: pull the rich incident metadata from the INCIDENT cluster's Agent Builder. */
export async function investigateIncidentMetadata({
  agentClient,
  incidentId,
  log,
}: {
  agentClient: IncidentAgentClient;
  incidentId: string;
  log: ToolingLog;
}): Promise<IncidentMetadata> {
  const metadata = await converseForJson({
    agentClient,
    schema: metadataSchema,
    systemRules: METADATA_RULES,
    firstInput: `Gather the metadata for incident ${incidentId}.`,
    label: `Investigating incident ${incidentId} metadata (incident cluster)`,
    log,
  });

  // The date/timeline anchor the whole capture window, but the LLM is unreliable
  // here — it tends to copy a nested service `created_at` instead of the incident's
  // own start time. Read the real timestamps deterministically and override.
  await overrideIncidentDates({ agentClient, incidentId, metadata, log });

  log.info(
    `Incident metadata: "${metadata.title}" (${metadata.date}), region=${
      metadata.region ?? 'n/a'
    }, services=[${metadata.services.join(', ')}], ${
      metadata.errorSignatures.length
    } error signature(s).`
  );
  return metadata;
}

/**
 * Overwrites `metadata.date` / `metadata.timeline` with the incident's REAL
 * timestamps read straight from `rootly_incidents` via ES|QL. Best-effort: on any
 * failure it leaves the LLM-provided values in place (with a warning).
 */
async function overrideIncidentDates({
  agentClient,
  incidentId,
  metadata,
  log,
}: {
  agentClient: IncidentAgentClient;
  incidentId: string;
  metadata: IncidentMetadata;
  log: ToolingLog;
}): Promise<void> {
  const sequentialId = Number(incidentId);
  if (!Number.isInteger(sequentialId)) {
    return;
  }
  try {
    const { columns, values } = await agentClient.queryEsql(
      `FROM rootly_incidents,rootly_incidents-staging-001 ` +
        `| WHERE rootly.sequential_id == ${sequentialId} ` +
        `| KEEP rootly.started_at, rootly.created_at, rootly.detected_at, rootly.mitigated_at, rootly.resolved_at ` +
        `| LIMIT 1`
    );
    const row = values[0];
    if (!row) {
      log.warning(`Could not read real timestamps for incident ${incidentId}; keeping LLM dates.`);
      return;
    }
    const at = (field: string): string | undefined => {
      const idx = columns.findIndex((column) => column.name === field);
      const value = idx >= 0 ? row[idx] : undefined;
      return typeof value === 'string' && value.length > 0 ? value : undefined;
    };
    const started = at('rootly.started_at') ?? at('rootly.created_at');
    if (!started) {
      log.warning(`No started_at/created_at for incident ${incidentId}; keeping LLM dates.`);
      return;
    }
    const previousDate = metadata.date;
    metadata.date = started.slice(0, 10);
    metadata.timeline = {
      started,
      detected: at('rootly.detected_at'),
      mitigated: at('rootly.mitigated_at'),
      resolved: at('rootly.resolved_at'),
    };
    if (previousDate !== metadata.date) {
      log.info(
        `Corrected incident date ${previousDate} → ${metadata.date} (from rootly_incidents).`
      );
    }
  } catch (error) {
    log.warning(
      `Failed to read real timestamps for incident ${incidentId} (${
        error instanceof Error ? error.message : String(error)
      }); keeping LLM dates.`
    );
  }
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
