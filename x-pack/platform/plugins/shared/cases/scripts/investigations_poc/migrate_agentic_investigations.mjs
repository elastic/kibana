#!/usr/bin/env node
// Migrates agentic_investigations (Agent Builder `investigation` conversations plus their side
// indices) to Cases investigation records.
//
//   node migrate_agentic_investigations.mjs [--dry-run]
//
// Per conversation (template_id: investigation) this creates one investigation record and, from the
// side documents, entity items (subjects, impact entities), claim items (hypotheses) and note
// evidence items (impact summary, impact evidence text, verdict). Proposals and the subject-claim
// index are left untouched.
//
// Idempotency: the record carries the tag `agentic-investigation:<conversation id>`; on a re-run
// the record is found by that tag and only items whose source document id is not yet present in
// an existing item's `derived_from` link are created.
//
// Links between the two sides:
//   record -> conversation: `conversation_id` / `conversation_ids` written straight to the record
//     document in ES (PATCH cannot set them).
//   conversation -> record: `metadata.cases_record_id` written straight to `.chat-conversations`
//     as kibana_system (the `investigation` template declares no record key, `metadata` is a
//     flattened field; `.chat-*` is a restricted index that even `elastic` cannot write).
import { es, kbn, log, parseArgs, sha256 } from './lib/client.mjs';

const BASE = '/internal/cases/investigations';
const RECORDS_INDEX = '.kibana-cases-investigation-records';
const CONVERSATIONS_INDEX = '.chat-conversations';
const SUBJECT_INDEX = '.kibana-investigation-subject';
const IMPACT_INDEX = '.kibana-investigation-impact';
const HYPOTHESES_INDEX = '.kibana-investigation-hypotheses';
const SYSTEM_AUTH = process.env.KBN_SYSTEM_AUTH ?? 'kibana_system:changeme';

const MAX_BULK = 1000;
const MAX_TITLE = 512;
const MAX_TEXT = 30000;
const MAX_SHORT = 2048;

const MIGRATION_ACTOR = {
  type: 'automation',
  id: 'agentic-investigations-migration',
  name: 'Agentic investigations migration',
};

const dryRun = Boolean(parseArgs()['dry-run']);

const clip = (value, max) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

// --- helpers ------------------------------------------------------------------------------------

/** Deterministic display id. Letters only on purpose: the server derives `display_num` from the
 * digits of a supplied display id, and digit-free ids fall back to the next sequence number. */
const displayIdFor = (conversationId) => {
  const bytes = Buffer.from(sha256(conversationId).slice(0, 12), 'hex');
  return `INV-M${Array.from(bytes, (byte) => String.fromCharCode(65 + (byte % 26))).join('')}`;
};

const tagFor = (conversationId) => `agentic-investigation:${conversationId}`;

const guessInvestigationType = (text) => {
  if (/phish|lookalike|credential[- ]harvest/i.test(text)) return 'Phishing';
  if (
    /impossible[- ]travel|account compromise|compromised (account|credential)|service account|credential (leak|exposed)/i.test(
      text
    )
  ) {
    return 'Account compromise';
  }
  if (/malware|powershell|ransom|trojan|payload|loader|macro/i.test(text)) return 'Malware';
  return 'Alert triage';
};

// The legacy conversation's severity becomes the record's priority (the case severity).
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

// The record's type is a Cases template (an investigation type) tagged `investigation-type`.
let typesByName;
const getType = async (name) => {
  if (!typesByName) {
    const { json } = await kbn('GET', `${BASE}/_types`);
    typesByName = new Map((json.types ?? json).map((t) => [t.name, t]));
  }
  const type = typesByName.get(name) ?? typesByName.get('Alert triage');
  if (!type) throw new Error('No investigation types found (not even "Alert triage"). Run: node setup.mjs');
  return type;
};

// Values the template rules accept for the close-required fields. Migrated conversations carry no form data, so
// only `impact` (from the migrated entities) is set at creation; the type-specific close field and the root cause
// notes are written when a closed conversation closes its record.
const CLOSE_FIELD_BY_TYPE = {
  Malware: ['remediation_as_keyword', 'Removed malware'],
  Phishing: ['purge_status_as_keyword', 'Purged'],
  'Account compromise': ['credentials_reset_as_keyword', 'Yes'],
  'Alert triage': ['tuning_action_as_keyword', 'None'],
};
const impactOf = (plannedItems) => {
  const entities = plannedItems.filter((p) => p.kind === 'entity').length;
  return `${entities} ${entities === 1 ? 'entity' : 'entities'} in scope`;
};
const closeNotes = ({ root_cause: rootCause }, summary) =>
  clip(`Root cause: ${rootCause}. ${summary || 'Closed in the agentic investigation.'}`, 2000).padEnd(20, '.');

const searchAll = async (index, query, { auth, source, sort } = {}) => {
  const hits = [];
  let searchAfter;
  for (;;) {
    const res = await es(
      'POST',
      `/${index}/_search?ignore_unavailable=true`,
      {
        size: 500,
        query,
        ...(source && { _source: source }),
        sort: sort ?? [{ _doc: 'asc' }],
        ...(searchAfter && { search_after: searchAfter }),
      },
      { auth, okStatuses: [200, 404] }
    );
    const page = res.json?.hits?.hits ?? [];
    hits.push(...page);
    if (page.length < 500) return hits;
    searchAfter = page[page.length - 1].sort;
  }
};

const entityKey = (type, name) => `${type}:${name.toLowerCase()}`;

const IMPACT_TYPE_MAP = { host: 'host', user: 'user', nhi: 'nhi', service_account: 'nhi' };

const hostOf = (snapshot = {}) => snapshot.host_name ?? snapshot['host.name'] ?? snapshot.host;
const userOf = (snapshot = {}) => snapshot.user_name ?? snapshot['user.name'] ?? snapshot.user;

// --- planning: source documents -> item inputs --------------------------------------------------

/**
 * Builds the items a conversation should produce. Each item carries the ids of the source
 * documents it derives from (`sourceIds`) so a re-run can tell what already exists.
 */
const buildPlan = ({ conversation, subjects, impacts, hypothesesDocs }) => {
  const { id: conversationId, metadata = {}, title } = conversation;
  const entities = new Map(); // key -> item draft
  const claims = [];
  const notes = [];

  const upsertEntity = ({ sourceId, type, name, status, text, attributes, createdAt }) => {
    const key = entityKey(type, name);
    const existing = entities.get(key);
    if (existing) {
      existing.sourceIds.push(sourceId);
      if (status === 'primary') existing.status = 'primary';
      existing.attributes.push(...attributes.filter((a) => !existing.attributes.some((b) => b[0] === a[0] && b[1] === a[1])));
      return;
    }
    entities.set(key, { sourceIds: [sourceId], type, name, status, text, attributes: [...attributes], createdAt });
  };

  for (const { _id: docId, _source: subject } of subjects) {
    const snapshot = subject.snapshot ?? {};
    const attributes = [['Source', `Agentic investigation subject (${subject.subjectType})`]];
    if (snapshot.rule_name) attributes.push(['Alert rule', snapshot.rule_name]);
    if (snapshot.reason) attributes.push(['Alert reason', clip(snapshot.reason, 1000)]);
    const host = hostOf(snapshot);
    const user = userOf(snapshot);
    const common = { text: subject.summary ?? null, attributes, createdAt: subject.createdAt };
    if (subject.subjectType === 'alert' && (host || user)) {
      if (host) {
        upsertEntity({ ...common, sourceId: `${docId}:host`, type: 'host', name: String(host), status: 'primary' });
      }
      if (user) {
        upsertEntity({ ...common, sourceId: `${docId}:user`, type: 'user', name: String(user), status: 'primary' });
      }
    } else {
      upsertEntity({
        ...common,
        sourceId: docId,
        type: 'external',
        name: String(subject.subjectId),
        status: 'external',
      });
    }
  }

  for (const { _id: docId, _source: impact } of impacts) {
    for (const entity of impact.entities ?? []) {
      const type = IMPACT_TYPE_MAP[entity.type] ?? 'external';
      const attributes = [['Source', 'Agentic investigation impact']];
      if (entity.id && entity.id !== entity.name) attributes.push(['Entity id', entity.id]);
      if (entity.type) attributes.push(['Original type', entity.type]);
      if (entity.streamName) attributes.push(['Stream', entity.streamName]);
      upsertEntity({
        sourceId: `${docId}:${entity.id}`,
        type,
        name: entity.name ?? entity.id,
        status: type === 'external' ? 'external' : 'scoped',
        text: entity.evidence?.description ?? null,
        attributes,
        createdAt: impact.createdAt,
      });
    }
    if (impact.summary) {
      notes.push({
        sourceId: `${docId}:summary`,
        title: 'Impact summary',
        text: impact.summary,
        why: 'Impact summary from the agentic investigation',
        createdAt: impact.createdAt,
      });
    }
    if (impact.evidence?.description) {
      notes.push({
        sourceId: `${docId}:evidence`,
        title: 'Impact evidence',
        text: impact.evidence.description,
        why: 'Impact evidence from the agentic investigation',
        createdAt: impact.createdAt,
      });
    }
  }

  for (const { _id: docId, _source: doc } of hypothesesDocs) {
    for (const hypothesis of doc.hypotheses ?? []) {
      const status =
        hypothesis.status === 'confirmed' ? 'supported' : hypothesis.status === 'dismissed' ? 'refuted' : 'open';
      const evidenceText = (hypothesis.evidence ?? [])
        .map((e) => e.description)
        .filter(Boolean)
        .join('\n\n');
      const reasoning = [hypothesis.reason, evidenceText && `Evidence: ${evidenceText}`].filter(Boolean).join('\n\n');
      claims.push({
        sourceId: `${docId}:h:${sha256(hypothesis.candidate).slice(0, 12)}`,
        question: hypothesis.candidate,
        status,
        confidence: Math.round(Math.max(0, Math.min(1, hypothesis.confidence ?? 0)) * 100),
        reasoning,
        reason: hypothesis.reason ?? null,
        createdAt: doc.createdAt,
      });
    }
  }

  if (metadata.verdict) {
    notes.push({
      sourceId: `${conversationId}:verdict`,
      title: 'Verdict',
      text: metadata.verdict,
      why: 'Verdict recorded on the agentic investigation',
      createdAt: conversation.created_at,
    });
  }

  const link = (sourceIds) => sourceIds.map((target_id) => ({ relation: 'derived_from', target_id }));
  const items = [];
  for (const entity of entities.values()) {
    items.push({
      sourceIds: entity.sourceIds,
      kind: 'entity',
      key: entityKey(entity.type, entity.name),
      input: {
        kind: 'entity',
        title: clip(entity.name, MAX_TITLE),
        text: entity.text ? clip(entity.text, MAX_TEXT) : null,
        status: entity.status,
        links: link(entity.sourceIds),
        entity: {
          type: entity.type,
          name: clip(entity.name, 512),
          evidence_ids: [],
          attributes: entity.attributes.slice(0, 200).map(([k, v]) => [clip(String(k), 4096), clip(String(v), 4096)]),
          tags: ['migrated'],
        },
        ...(entity.createdAt && { created_at: entity.createdAt }),
      },
    });
  }
  for (const claim of claims) {
    items.push({
      sourceIds: [claim.sourceId],
      kind: 'claim',
      input: {
        kind: 'claim',
        title: clip(claim.question, MAX_TITLE),
        status: claim.status,
        links: link([claim.sourceId]),
        claim: {
          question: clip(claim.question, MAX_SHORT),
          conclusion: claim.status === 'open' ? null : claim.reason && clip(claim.reason, MAX_TEXT),
          note: claim.reason ? clip(claim.reason, MAX_TEXT) : null,
          reasoning: claim.reasoning ? clip(claim.reasoning, MAX_TEXT) : null,
          confidence: claim.confidence,
          needs_review: false,
          supporting_evidence_ids: [],
          opposing_evidence_ids: [],
          gaps: [],
          source_message: null,
        },
        ...(claim.createdAt && { created_at: claim.createdAt }),
      },
    });
  }
  for (const note of notes) {
    const text = clip(note.text, MAX_TEXT);
    items.push({
      sourceIds: [note.sourceId],
      kind: 'note',
      input: {
        kind: 'evidence',
        title: note.title,
        text,
        links: link([note.sourceId]),
        evidence: {
          type: 'note',
          why: note.why,
          source: { label: 'Agentic investigation', kind: 'manual', conversation_id: conversationId },
          snapshot: { kind: 'note', text },
        },
        ...(note.createdAt && { created_at: note.createdAt }),
      },
    });
  }
  return { items, title };
};

// --- Cases API ----------------------------------------------------------------------------------

const findRecordByTag = async (tag) => {
  const params = new URLSearchParams({ tags: tag, per_page: '2' });
  const { json } = await kbn('GET', `${BASE}/_find?${params}`);
  return json.records?.[0];
};

const listItems = async (recordId) => {
  const items = [];
  for (let page = 1; ; page++) {
    const { json } = await kbn('GET', `${BASE}/${encodeURIComponent(recordId)}/items?per_page=100&page=${page}`);
    items.push(...json.items);
    if (items.length >= json.total || json.items.length === 0) return items;
  }
};

// Cases close reasons: true_positive, false_positive, benign_positive, other (or any custom text). The root cause is
// not a close field any more; it goes into the template's "Root cause notes" field on the close.
const inferClose = (verdictText = '', summary = '') => {
  const text = `${verdictText} ${summary}`;
  if (/false positive/i.test(text)) {
    return { close_reason: 'false_positive', human_verdict: 'false_positive', root_cause: 'Detection fired on activity that was not a threat' };
  }
  if (/benign|expected|no action|test/i.test(text)) {
    return { close_reason: 'benign_positive', human_verdict: 'benign_positive', root_cause: 'Authorized activity' };
  }
  if (/malware|compromise|phishing|exposed/i.test(text)) {
    return { close_reason: 'true_positive', human_verdict: 'true_positive', root_cause: 'Unknown' };
  }
  return { close_reason: 'other', human_verdict: 'undetermined', root_cause: 'Unknown' };
};

// --- main ---------------------------------------------------------------------------------------

const report = {
  conversations: 0,
  records: { created: 0, skipped: 0 },
  items: {
    entity: { created: 0, skipped: 0 },
    claim: { created: 0, skipped: 0 },
    note: { created: 0, skipped: 0 },
  },
  links: { recordToConversation: 0, conversationToRecord: 0 },
  closed: 0,
  templatesApplied: 0,
  errors: [],
};

const migrateConversation = async (hit) => {
  const conversation = { id: hit._id, ...hit._source };
  const { id: conversationId, metadata = {} } = conversation;
  const tag = tagFor(conversationId);

  const [subjects, impacts, hypothesesDocs] = await Promise.all(
    [SUBJECT_INDEX, IMPACT_INDEX, HYPOTHESES_INDEX].map((index) =>
      searchAll(index, { term: { conversationId } }, { sort: [{ createdAt: 'asc' }] })
    )
  );
  const { items: plannedItems } = buildPlan({ conversation, subjects, impacts, hypothesesDocs });

  const existingRecord = await findRecordByTag(tag);
  let recordId = existingRecord?.id;
  const existingSourceIds = new Set();
  const existingEntityKeys = new Set();
  let typeName; // investigation type of a record created in this run

  if (existingRecord) {
    report.records.skipped++;
    if (!existingRecord.template_id) {
      // Created by an earlier run, before investigation types were Cases templates.
      const type = await getType(existingRecord.investigation_type);
      if (dryRun) {
        log(`[dry-run] would apply the "${type.name}" template to record ${existingRecord.display_id}`);
      } else {
        try {
          await kbn('PATCH', `${BASE}/${encodeURIComponent(recordId)}`, {
            template: { id: type.template_id, version: type.version },
            extended_fields: { impact_as_keyword: impactOf(plannedItems) },
            actor: MIGRATION_ACTOR,
          });
          report.templatesApplied++;
          log(`applied the "${type.name}" template to record ${existingRecord.display_id}`);
        } catch (error) {
          report.errors.push(`${conversationId}: applying the template: ${error.message}`);
        }
      }
    }
    for (const item of await listItems(recordId)) {
      for (const itemLink of item.links ?? []) {
        if (itemLink.relation === 'derived_from') existingSourceIds.add(itemLink.target_id);
      }
      if (item.kind === 'entity') existingEntityKeys.add(entityKey(item.entity.type, item.entity.name));
    }
  } else {
    const text = `${conversation.title ?? ''} ${metadata.summary ?? ''} ${metadata.verdict ?? ''}`;
    const type = await getType(guessInvestigationType(text));
    const investigationType = type.name;
    typeName = type.name;
    const priority = PRIORITIES.includes(metadata.severity) ? metadata.severity : 'medium';
    const body = {
      title: clip(conversation.title?.trim() || `Agentic investigation ${conversationId.slice(0, 8)}`, MAX_TITLE),
      description: clip(metadata.summary || 'Migrated from an agentic investigation.', MAX_TEXT),
      summary: metadata.summary ? clip(metadata.summary, MAX_TEXT) : null,
      template_id: type.template_id,
      extended_fields: { impact_as_keyword: impactOf(plannedItems) },
      priority,
      access: { mode: 'default' },
      ai_enabled: true,
      create_conversation: false,
      apply_procedure: false,
      origin: { type: 'agent', label: `Migrated from agentic investigation ${conversationId}` },
      tags: ['migrated', tag],
      display_id: displayIdFor(conversationId),
      ...(conversation.created_at && { created_at: conversation.created_at }),
      actor: MIGRATION_ACTOR,
    };
    if (dryRun) {
      log(`[dry-run] would create record ${body.display_id} "${body.title}" (${investigationType}, ${priority})`);
      report.records.created++;
    } else {
      const { json } = await kbn('POST', BASE, body);
      recordId = json.record.id;
      report.records.created++;
      log(`created record ${recordId} ${body.display_id} "${body.title}" (${investigationType}, ${priority})`);
    }
  }

  // Items still to create. An entity is also skipped when an existing entity has the same name.
  const toCreate = [];
  for (const planned of plannedItems) {
    const kind = planned.kind;
    const alreadyThere =
      planned.sourceIds.every((id) => existingSourceIds.has(id)) ||
      (planned.kind === 'entity' && existingEntityKeys.has(planned.key));
    if (alreadyThere) {
      report.items[kind].skipped++;
    } else {
      toCreate.push(planned);
    }
  }

  if (dryRun) {
    for (const planned of toCreate) {
      report.items[planned.kind].created++;
      log(`[dry-run]   would create ${planned.kind} "${planned.input.title}"`);
    }
  } else if (toCreate.length > 0) {
    for (let i = 0; i < toCreate.length; i += MAX_BULK) {
      const chunk = toCreate.slice(i, i + MAX_BULK);
      const { json } = await kbn(
        'POST',
        `${BASE}/${encodeURIComponent(recordId)}/items/_bulk_create`,
        {
          items: chunk.map(({ input }) => input),
          actor: MIGRATION_ACTOR,
          extract_indicators: false,
          link_alerts: false,
        }
      );
      const failed = new Set((json.errors ?? []).map((e) => e.index));
      chunk.forEach((planned, index) => {
        if (failed.has(index)) return;
        report.items[planned.kind].created++;
      });
      for (const error of json.errors ?? []) {
        report.errors.push(`${conversationId}: item ${chunk[error.index]?.input.title}: ${error.message}`);
      }
    }
  }

  if (dryRun || !recordId) return;

  // record -> conversation (only when it is not there yet; a re-run repairs a half-linked record).
  const currentRecord = existingRecord;
  if (!currentRecord || currentRecord.conversation_id !== conversationId) {
    await es(
      'POST',
      `/${RECORDS_INDEX}/_update/${encodeURIComponent(recordId)}?refresh=wait_for`,
      { doc: { conversation_id: conversationId, conversation_ids: [conversationId] } }
    );
    report.links.recordToConversation++;
  }
  // conversation -> record.
  if (metadata.cases_record_id !== recordId) {
    await es(
      'POST',
      `/${CONVERSATIONS_INDEX}/_update/${encodeURIComponent(conversationId)}?refresh=wait_for`,
      { doc: { metadata: { cases_record_id: recordId } } },
      { auth: SYSTEM_AUTH }
    );
    report.links.conversationToRecord++;
  }

  // Closed conversations: close the new record, after its items are in.
  if (!existingRecord && metadata.status === 'closed') {
    const close = inferClose(metadata.verdict, metadata.summary);
    const [closeKey, closeValue] = CLOSE_FIELD_BY_TYPE[typeName] ?? [];
    const closeSummary = clip(metadata.verdict || metadata.summary || 'Closed in the agentic investigation.', MAX_TEXT);
    await kbn('POST', `${BASE}/${encodeURIComponent(recordId)}/_close`, {
      extended_fields: {
        ...(closeKey && { [closeKey]: closeValue }),
        // The optional global field (created by setup.mjs); migrated conversations carry no customer data.
        customer_impact_as_keyword: 'None',
        root_cause_notes_as_keyword: closeNotes(close, closeSummary),
      },
      close_reason: close.close_reason,
      human_verdict: close.human_verdict,
      summary: closeSummary,
      actor: MIGRATION_ACTOR,
      ...(conversation.updated_at && { closed_at: conversation.updated_at }),
    });
    report.closed++;
    log(`closed record ${recordId} (${close.close_reason})`);
  }
};

const main = async () => {
  log(`agentic investigations migration${dryRun ? ' (dry run)' : ''}`);
  const hits = await searchAll(
    CONVERSATIONS_INDEX,
    { term: { template_id: 'investigation' } },
    { source: { excludes: ['attachments', 'conversation_rounds', 'events'] }, sort: [{ created_at: 'asc' }, { _doc: 'asc' }] }
  );
  report.conversations = hits.length;
  for (const hit of hits) {
    try {
      await migrateConversation(hit);
    } catch (error) {
      report.errors.push(`${hit._id}: ${error.message}`);
      log(`ERROR ${hit._id}: ${error.message}`);
    }
  }

  const sum = (key) => Object.values(report.items).reduce((total, counts) => total + counts[key], 0);
  console.log('\n=== Migration report' + (dryRun ? ' (dry run, nothing written)' : '') + ' ===');
  console.log(`conversations found : ${report.conversations}`);
  console.log(`records created     : ${report.records.created}`);
  console.log(`records skipped     : ${report.records.skipped}`);
  for (const [kind, counts] of Object.entries(report.items)) {
    console.log(`items ${kind.padEnd(7)}      : created ${counts.created}, skipped ${counts.skipped}`);
  }
  console.log(`items total         : created ${sum('created')}, skipped ${sum('skipped')}`);
  if (!dryRun) {
    console.log(`links written       : record->conversation ${report.links.recordToConversation}, conversation->record ${report.links.conversationToRecord}`);
    console.log(`records closed      : ${report.closed}`);
    console.log(`templates applied   : ${report.templatesApplied} (records from earlier runs)`);
  }
  console.log(`errors              : ${report.errors.length}`);
  for (const error of report.errors) console.log(`  - ${error}`);
  if (report.errors.length > 0) process.exitCode = 1;
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
