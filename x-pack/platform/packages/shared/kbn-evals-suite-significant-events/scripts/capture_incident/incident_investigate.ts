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
  // The internal public status-page title, which can phrase the incident
  // differently from `title`
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
  // Precise incident lifecycle timestamps (full ISO). Handed to the agent so its
  // searchWindow is grounded in the real window instead of a date-padded guess.
  window: z
    .object({
      startedAt: z.string().optional(),
      detectedAt: z.string().optional(),
      acknowledgedAt: z.string().optional(),
      mitigatedAt: z.string().optional(),
      resolvedAt: z.string().optional(),
    })
    .optional(),
  slackChannel: z.string().optional(),
  // The incident regions may be cloud-prefixed (e.g. `aws.ap-southeast-2`); handed
  // to the agent RAW so it resolves the bare region + remote alias itself.
  regions: z.array(z.string()).default([]),
  // The cloud service providers involved (e.g. `aws`, `gcp`), from the rootly
  // `environments` custom field — a hint for which remote alias holds the logs.
  environments: z.array(z.string()).default([]),
  // The deployment environment (e.g. `Production`), distinct from the CSP list.
  environment: z.string().optional(),
  // Causal services ("Docker Registry") — the strongest WHERE-to-look signal.
  services: z.array(z.string()).default([]),
  // Affected services (top-level rootly `services` + customer-impact tagging) —
  // often where the symptom logs concentrate (an entityField hint).
  affectedServices: z.array(z.string()).default([]),
  // Structured failure taxonomy ("Errors caused by third party service failure").
  // Steers the search STRATEGY (class of failure) without any text mining.
  causes: z.array(z.string()).default([]),
  // Products impacted ("Elastic Cloud Serverless") — narrows the product namespace.
  productsImpacted: z.array(z.string()).default([]),
  // Owning team — routes the search to the right cluster/namespace/team.
  owningTeam: z.array(z.string()).default([]),
  // Customer-impact type (internal vs external) + a coarse impacted count; both
  // help the agent scope log sources and gauge severity.
  customerImpactType: z.string().optional(),
  customerImpactCount: z.string().optional(),
  // Free-text narratives — the richest sources of the literal error strings the
  // symptom is built from. `summary` + `mitigation` + `resolution` +
  // `customerImpact` join the PagerDuty alert text as token-mining inputs.
  summary: z.string().optional(),
  mitigation: z.string().optional(),
  resolution: z.string().optional(),
  customerImpact: z.string().optional(),
  pagerduty: z
    .object({
      title: z.string().optional(),
      firstTriggerLogEntrySummary: z.string().optional(),
      id: z.string().optional(),
      url: z.string().optional(),
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
  // An EVIDENCE-ONLY bool symptom matching just the incident's error log lines (no
  // entity scoping). The probe broadens it into query.snapshot deterministically
  // from where these hits land.
  symptom: queryDslSchema,
});

export type LogDerivation = z.infer<typeof derivationSchema>;

/**
 * Single-round rules for the logs-cluster agent: locate the remote, then build +
 * verify an evidence-only symptom and its searchWindow against the REAL logs. The
 * live remote aliases (when known) are listed so the agent returns one verbatim.
 * One retry (`MAX_ATTEMPTS`) absorbs the occasional empty round.
 */
const buildDerivationRules = (remotes: string[]): string =>
  `You are on the LOGS cluster — a Cross-Cluster-Search hub over MANY remotes named like "logging-<region>" and "serverless-logging-<region>". You are given the FACTS about an incident (below). Query a remote with FROM <remote>:logs-*. Do NOT guess — confirm each value with a query. Keep tool use MINIMAL (at most 4 calls total). The MOMENT you can fill every field, STOP running tools and emit the JSON — do NOT keep exploring for a "better" answer. Your turn MUST end with a text message containing the JSON; NEVER end the turn on a tool call.

remoteCluster: the remote that holds the affected services' logs.${
    remotes.length > 0
      ? `\n  The LIVE remote aliases are:\n${remotes
          .map((remote) => `    - ${remote}`)
          .join('\n')}\n  Return EXACTLY one of these.`
      : ''
  }
  Pick the family by prefix from "productsImpacted" (a Serverless product -> "serverless-logging-<region>", a stateful/hosted product -> "logging-<region>"); if ambiguous, consider both. Pick the region from "regions" (strip any cloud prefix, e.g. "aws.ap-southeast-2" -> "ap-southeast-2"); "environments" (CSP) is only a cloud tie-breaker. If the region is absent or lists several, enumerate the candidate remotes and choose the one whose logs actually carry the symptom. Confirm with 1-2 quick counts.

symptom: an EVIDENCE-ONLY STRUCTURED bool query that matches JUST the incident's error/symptom log lines — NEVER a query_string, and NEVER a @timestamp range. Build it ONLY from literal ERROR text: match_phrase on "message" per error token (exception names, error phrases, status codes, failure keywords like "ImagePullBackOff"), optionally a term on a populated keyword field (e.g. { "term": { "log.level": "ERROR" } }). Mine the FACTS narratives ("summary" / "mitigation" / "resolution" / "customerImpact" / PagerDuty text) for these literal strings; use "causes" only to pick the CLASS of failure, never as a token. Do NOT scope by entity/service/host/project — that broadening is derived downstream from where these hits land; keep the symptom to the evidence only. NEVER use a service/product/team NAME as an error token (as tokens they match unrelated noise across many datasets). Combine tokens in a bool (required -> "filter", alternatives -> "should" + "minimum_should_match": 1). VERIFY it matches an incident-CLUSTERED set (tens to low thousands during the incident), concentrated in ONE or a FEW datasets.

searchWindow: a WIDE ISO-8601 UTC window that certainly brackets all symptom logs. When the FACTS include a "window" (startedAt/detectedAt/mitigatedAt/resolvedAt), ANCHOR on it — a few hours before the earliest and after the latest. Otherwise pad the incident "date" generously (a day each side).

Your FINAL message MUST be a fenced JSON block in EXACTLY this shape (a plain text message, never a tool call). Emit it even if you are only partially sure — a best-effort answer is validated downstream, a missing answer wastes a full retry round:

\`\`\`json
{
  "remoteCluster": "logging-<region>",
  "searchWindow": { "gte": "ISO", "lt": "ISO" },
  "symptom": { "bool": { "should": [ { "match_phrase": { "message": "<literal token>" } } ], "minimum_should_match": 1 } }
}
\`\`\``;

// ---------------------------------------------------------------------------
// Shared conversation runner
// ---------------------------------------------------------------------------

/**
 * Scans for every balanced top-level `{…}` object in `text`, string-aware so braces
 * inside quoted strings don't miscount. Used as a fallback when the agent emits valid
 * JSON but forgets the ```json fence (or wraps it in prose) — salvaging that response
 * avoids paying for a whole extra (multi-minute) derivation round.
 */
function balancedObjects(text: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') {
      continue;
    }
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let j = i; j < text.length; j++) {
      const ch = text[j];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
      } else if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          out.push(text.slice(i, j + 1));
          i = j;
          break;
        }
      }
    }
  }
  return out;
}

/**
 * Extracts candidate JSON strings from an agent message, most-likely-final first:
 * every fenced \`\`\`json block in REVERSE order (the final answer is usually the last
 * block, after any "thinking out loud" / example snippets), then any balanced bare
 * `{…}` object (also last-first) as a fallback for when the agent drops the fence.
 * `parseAgainst` validates each against the schema, so extra non-matching spans are
 * harmless — this only widens what can be salvaged from a single round.
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
  const bare = balancedObjects(message).map((span) => span.trim());
  return [...new Set([...fenced.reverse(), ...bare.reverse()])];
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
      `Raw agent message (${turn.message.length} chars): ${JSON.stringify(
        turn.message.slice(0, 800)
      )}`
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

/**
 * Collects one string property (e.g. `name` or `slug`) from each object in an
 * array-valued field like `rootly.causes` / `rootly.environments` / `rootly.services`
 * (`[{ name, slug, description, … }]`). `getField` cannot descend into array
 * elements, so these need the parent array + an explicit key. Returns distinct,
 * trimmed values in document order.
 */
function pluck(node: unknown, key: string): string[] {
  const items = Array.isArray(node) ? node : node == null ? [] : [node];
  const out: string[] = [];
  for (const item of items) {
    if (item && typeof item === 'object') {
      const value = (item as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        out.push(value.trim());
      }
    }
  }
  return [...new Set(out)];
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
  const detectedAt = firstString(rootly, 'rootly.detected_at');
  const acknowledgedAt = firstString(rootly, 'rootly.acknowledged_at');
  const mitigatedAt = firstString(rootly, 'rootly.mitigated_at');
  const resolvedAt = firstString(rootly, 'rootly.resolved_at');
  // Only emit the window block when at least one timestamp resolved; an all-empty
  // object would just be noise in the facts handed to the agent.
  const window: Record<string, string> = {};
  if (started) window.startedAt = started;
  if (detectedAt) window.detectedAt = detectedAt;
  if (acknowledgedAt) window.acknowledgedAt = acknowledgedAt;
  if (mitigatedAt) window.mitigatedAt = mitigatedAt;
  if (resolvedAt) window.resolvedAt = resolvedAt;

  // Affected services come from the top-level rootly `services` array (objects with
  // `name`/`slug`); prefer names, fall back to slugs. NOTE: `customer-impact`'s
  // `selected_*` arrays only mirror the free-text impact string, so they are NOT a
  // service source.
  const servicesByName = pluck(getField(rootly, 'rootly.services'), 'name');
  const affectedServices =
    servicesByName.length > 0 ? servicesByName : pluck(getField(rootly, 'rootly.services'), 'slug');

  const pdId = firstString(rootly, 'rootly.pagerduty_incident_id');
  const pdUrl = firstString(rootly, 'rootly.pagerduty_incident_url');

  const raw: Record<string, unknown> = {
    // A missing title should fail the schema loudly rather than be masked by a
    // placeholder — the agent uses it as a fact when deriving the symptom.
    title: firstString(rootly, 'rootly.title', 'rootly.public_title') ?? '',
    publicTitle: firstString(rootly, 'rootly.public_title'),
    // Deterministic date from the real incident timestamp (the schema trims it to
    // YYYY-MM-DD). A wrong year here makes the symptom match 0 logs.
    date: started ?? '',
    ...(Object.keys(window).length > 0 ? { window } : {}),
    slackChannel: firstString(rootly, 'rootly.slack_channel_name'),
    // Region custom field verbatim (may be cloud-prefixed); environments = CSP hints.
    regions: formFieldValues(getField(rootly, 'rootly.region')),
    // `environments` is an array of CSP objects; the lowercase `slug` (`aws`/`gcp`)
    // matches the remote-alias region convention.
    environments: pluck(getField(rootly, 'rootly.environments'), 'slug'),
    environment: formFieldFirst(rootly, 'rootly.environment'),
    // Causal service ("Docker Registry") is the strongest WHERE-to-look signal.
    services: formFieldValues(getField(rootly, 'rootly.causal-service')),
    affectedServices,
    // Structured failure taxonomy — steers the agent's search STRATEGY.
    causes: pluck(getField(rootly, 'rootly.causes'), 'name'),
    productsImpacted: formFieldValues(getField(rootly, 'rootly.product-s-impacted')),
    owningTeam: formFieldValues(getField(rootly, 'rootly.owning-team')),
    customerImpactType: formFieldFirst(rootly, 'rootly.customer-impact-type'),
    customerImpactCount: formFieldFirst(rootly, 'rootly.customer-impact-number'),
    summary: firstString(rootly, 'rootly.summary'),
    mitigation: firstString(rootly, 'rootly.mitigation_message'),
    resolution: firstString(rootly, 'rootly.resolution_message'),
    customerImpact: formFieldFirst(rootly, 'rootly.customer-impact'),
    ...(pagerduty
      ? {
          pagerduty: {
            title: firstString(pagerduty, 'pagerduty.description', 'pagerduty.summary'),
            firstTriggerLogEntrySummary: firstString(
              pagerduty,
              'pagerduty.first_trigger_log_entry.summary'
            ),
            ...(pdId ? { id: pdId } : {}),
            ...(pdUrl ? { url: pdUrl } : {}),
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
    `Incident metadata: "${metadata.title}" (${metadata.date}), regions=[${metadata.regions.join(
      ', '
    )}], environments=[${metadata.environments.join(
      ', '
    )}], causalServices=[${metadata.services.join(
      ', '
    )}], affectedServices=[${metadata.affectedServices.join(', ')}], causes=[${metadata.causes.join(
      ', '
    )}]${pagerduty ? ', +pagerduty' : ''}.`
  );
  return metadata;
}

/**
 * Drops empty-array facts so the agent only sees signals populated for THIS
 * incident (keeps the prompt generic + the legend truthful). `JSON.stringify`
 * already omits `undefined` scalars, and Step 1 never emits empty `window` /
 * `pagerduty` objects, so filtering empty arrays is all that is needed.
 */
function compactFacts(metadata: IncidentMetadata): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) =>
      Array.isArray(value) ? value.length > 0 : value != null
    )
  );
}

/**
 * Maps each fact to its ROLE in the derivation (by field NAME, never by value), so
 * the agent applies every populated signal to the right sub-decision. Fields absent
 * for an incident simply won't appear in the facts block above it.
 */
const FACTS_LEGEND = `How to use these facts (only the fields populated for THIS incident appear above):
- productsImpacted: PRIOR on the remote alias family. regions: candidate bare region(s). environments: cloud/CSP tie-breaker.
- owningTeam / services / causalServices / affectedServices: WHERE to look to FIND the symptom logs — never error tokens, never symptom clauses.
- summary / mitigation / resolution / customerImpact / pagerduty: mine for the LITERAL error strings. causes: the CLASS of failure.
- window / date: bracket the searchWindow.`;

/** Step 2: derive + verify the narrow symptom / remote / window on the LOGS cluster's Agent Builder. */
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
    compactFacts(metadata),
    null,
    2
  )}\n\`\`\``;

  const derivation = await converseForJson({
    agentClient,
    schema: derivationSchema,
    systemRules: buildDerivationRules(remotes),
    firstInput: `${factsBlock}\n\n${FACTS_LEGEND}\n\nDerive and VERIFY the remoteCluster, symptom, and searchWindow.`,
    label: `Deriving symptom for "${metadata.title}" (logs cluster)`,
    log,
  });

  log.info(
    `Log-grounded derivation: remote=${derivation.remoteCluster}, ` +
      `search window ${derivation.searchWindow.gte}..${derivation.searchWindow.lt}`
  );
  return derivation;
}
