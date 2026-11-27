#!/usr/bin/env node
// Seeds source data for the agentic_investigations -> Cases investigations migration.
//
//   node seed_agentic_investigations.mjs            # create / refresh the 4 seeded investigations
//   node seed_agentic_investigations.mjs --clean    # remove only what this script created
//
// Each scenario is an Agent Builder conversation on the `investigation` template plus documents in
// the agentic_investigations side indices (subject, impact, hypotheses, subject claim). Side
// documents are written straight to Elasticsearch as the elastic user (the plugin's own seeder does
// the same: there is no route for them) with the plugin's deterministic ids, then attached to the
// conversation by reference through the Agent Builder attachments route.
//
// Mappings mirror server/{subjects,impact,hypotheses}/storage/*.ts in the plugin (the adapter's
// `types.*` defaults: keyword `ignore_above: 1024`, date `format: strict_date_optional_time`).
// If an index alias already exists (the plugin's adapter created it) nothing is recreated.
import crypto from 'node:crypto';
import { es, kbn, log, parseArgs, uuidv5Like } from './lib/client.mjs';

const SEED_NAMESPACE = 'uipoc-agentic-seed:';
const SPACE_ID = 'default';
const CONVERSATIONS_INDEX = '.chat-conversations';
// `.chat-*` is a restricted index: even `elastic` cannot write it, so the timeline update uses
// kibana_system (as the plugin's own seeder does).
const SYSTEM_AUTH = process.env.KBN_SYSTEM_AUTH ?? 'kibana_system:changeme';

const SUBJECT_INDEX = '.kibana-investigation-subject';
const CLAIM_INDEX = '.kibana-investigation-claim';
const IMPACT_INDEX = '.kibana-investigation-impact';
const HYPOTHESES_INDEX = '.kibana-investigation-hypotheses';

const SUBJECT_ATTACHMENT_TYPE = 'investigation_subject';
const IMPACT_ATTACHMENT_TYPE = 'investigation_impact';
const HYPOTHESES_ATTACHMENT_TYPE = 'investigation_hypotheses';
const INVESTIGATION_TEMPLATE_ID = 'investigation';

// --- ids (server/investigation_attachments/doc_id.ts) -------------------------------------------

const hashId = (...parts) =>
  crypto
    .createHash('sha256')
    .update(parts.map((part) => `${part.length}:${part}`).join('\0'))
    .digest('hex');

const subjectDocId = (conversationId, { type, id }) =>
  hashId(SUBJECT_ATTACHMENT_TYPE, SPACE_ID, conversationId, type, id);
const hypothesesDocId = (conversationId) =>
  hashId(HYPOTHESES_ATTACHMENT_TYPE, SPACE_ID, conversationId);
// Impact predates the attachment factory: its id has no type prefix.
const impactDocId = (conversationId) => hashId(SPACE_ID, conversationId);
const claimDocId = ({ type, id }) => hashId(SPACE_ID, type, id);

// --- mappings (storage adapter layout) ----------------------------------------------------------

const keyword = (extra = {}) => ({ type: 'keyword', ignore_above: 1024, ...extra });
const date = () => ({ type: 'date', format: 'strict_date_optional_time' });
const userMapping = {
  type: 'object',
  properties: {
    username: keyword(),
    fullName: keyword(),
    email: keyword(),
    profileUid: keyword(),
  },
};

const SIDE_INDEX_MAPPINGS = {
  [SUBJECT_INDEX]: {
    spaceId: keyword(),
    conversationId: keyword(),
    subjectType: keyword(),
    subjectId: keyword(),
    summary: { type: 'text' },
    triggerType: keyword(),
    snapshot: { type: 'object', enabled: false },
    slack: {
      type: 'object',
      properties: {
        channel: keyword(),
        thread_ts: keyword(),
        status_message_ts: keyword(),
        permalink: keyword({ index: false }),
        seen_events: {
          type: 'object',
          properties: {
            event_id: keyword({ index: false }),
            execution_id: keyword({ index: false }),
          },
        },
      },
    },
    createdAt: date(),
    updatedAt: date(),
    createdBy: userMapping,
  },
  [CLAIM_INDEX]: {
    spaceId: keyword(),
    conversationId: keyword(),
    subjectType: keyword(),
    subjectId: keyword(),
    claimedAt: date(),
  },
  [IMPACT_INDEX]: {
    spaceId: keyword(),
    conversationId: keyword(),
    summary: { type: 'text' },
    evidence: { type: 'object', enabled: false },
    entityIds: keyword(),
    entities: {
      type: 'nested',
      properties: {
        id: keyword(),
        name: keyword(),
        type: keyword(),
        featureId: keyword(),
        streamName: keyword(),
        evidence: { type: 'object', enabled: false },
      },
    },
    createdAt: date(),
    updatedAt: date(),
    createdBy: userMapping,
  },
  [HYPOTHESES_INDEX]: {
    spaceId: keyword(),
    conversationId: keyword(),
    hypotheses: { type: 'object', enabled: false },
    createdAt: date(),
    updatedAt: date(),
    createdBy: userMapping,
  },
};

// --- scenarios ----------------------------------------------------------------------------------

const now = Date.now();
const iso = (minutesAgo) => new Date(now - minutesAgo * 60_000).toISOString();

const alertSnapshot = ({ id, ruleName, reason, minutesAgo, host, user }) => ({
  id,
  rule_id: `uipoc-rule-${id}`,
  rule_name: ruleName,
  rule_type_id: 'siem.queryRule',
  rule_category: 'Security',
  reason,
  status: 'active',
  start: iso(minutesAgo),
  timestamp: iso(minutesAgo),
  url: '/app/security/alerts',
  // Loose keys: the snapshot schema allows extra fields; the migration reads these for the entity.
  ...(host && { host_name: host }),
  ...(user && { user_name: user }),
});

const SCENARIOS = [
  {
    n: 1,
    title: 'Encoded PowerShell launched from Word on FIN-WS-0142',
    status: 'open',
    severity: 'high',
    summary:
      'Word spawned an encoded PowerShell command on FIN-WS-0142 that downloaded a second stage from a rare domain. The same user then signed in to the finance file server.',
    verdict:
      'Likely commodity malware delivered by a macro document. Host isolation and a credential reset are recommended.',
    createdMinutesAgo: 190,
    updatedMinutesAgo: 35,
    subjects: [
      {
        type: 'alert',
        id: 'uipoc-alert-fin-ws-0142-ps',
        summary: 'Suspicious PowerShell child of WINWORD.EXE',
        snapshot: alertSnapshot({
          id: 'uipoc-alert-fin-ws-0142-ps',
          ruleName: 'Suspicious PowerShell Engine ImageLoad',
          reason: 'process event on FIN-WS-0142 by j.alvarez created high alert Suspicious PowerShell.',
          minutesAgo: 200,
          host: 'FIN-WS-0142',
          user: 'j.alvarez',
        }),
      },
      {
        type: 'alert',
        id: 'uipoc-alert-fin-ws-0142-dns',
        summary: 'DNS lookup to a newly registered domain',
        snapshot: alertSnapshot({
          id: 'uipoc-alert-fin-ws-0142-dns',
          ruleName: 'Network Connection to Newly Registered Domain',
          reason: 'dns event on FIN-WS-0142 queried cdn-update-check.example.',
          minutesAgo: 198,
          host: 'FIN-WS-0142',
        }),
      },
    ],
    claimedSubject: 0,
    impact: {
      summary:
        'One finance workstation is compromised and its user account may be exposed. The finance file server saw a sign-in from the workstation after the payload ran; no data movement was seen yet.',
      entities: [
        { id: 'host:fin-ws-0142', name: 'FIN-WS-0142', type: 'host' },
        { id: 'user:j.alvarez', name: 'j.alvarez', type: 'user' },
        { id: 'host:fin-fs-01', name: 'FIN-FS-01', type: 'host' },
      ],
    },
    hypotheses: [
      {
        candidate: 'A macro document delivered commodity malware',
        confidence: 0.86,
        status: 'confirmed',
        reason:
          'WINWORD.EXE spawned powershell.exe with `-enc`, and the payload URL matches a known loader family.',
        evidence: [{ description: 'Parent/child process chain WINWORD.EXE -> powershell.exe -enc.' }],
      },
      {
        candidate: 'The user ran an approved automation script',
        confidence: 0.06,
        status: 'dismissed',
        reason: 'No change record covers this script and the user has no history of running PowerShell.',
      },
      {
        candidate: 'The attacker moved to the finance file server',
        confidence: 0.45,
        status: 'investigating',
        reason: 'A sign-in from FIN-WS-0142 to FIN-FS-01 followed the payload; the session is still being reviewed.',
      },
    ],
  },
  {
    n: 2,
    title: 'Credential-harvesting email reported by 14 employees',
    status: 'open',
    severity: 'medium',
    summary:
      'Fourteen employees reported an email that imitates the HR portal and links to a lookalike sign-in page. Two users entered their credentials.',
    verdict: 'Phishing campaign with confirmed credential entry by two users.',
    createdMinutesAgo: 420,
    updatedMinutesAgo: 120,
    subjects: [
      {
        type: 'manual',
        id: 'uipoc-manual-hr-phish',
        summary: 'Phishing email imitating the HR portal reported by 14 employees',
      },
      {
        type: 'alert',
        id: 'uipoc-alert-hr-phish-url',
        summary: 'User visited a known phishing URL',
        snapshot: alertSnapshot({
          id: 'uipoc-alert-hr-phish-url',
          ruleName: 'Web Request to Known Phishing Domain',
          reason: 'network event by m.okafor to hr-portal-login.example created medium alert.',
          minutesAgo: 410,
          user: 'm.okafor',
        }),
      },
    ],
    claimedSubject: 0,
    impact: {
      summary:
        'Two accounts entered credentials on the lookalike page. Mailbox rules were not changed, but the accounts need a password reset and session revoke.',
      entities: [
        { id: 'user:m.okafor', name: 'm.okafor', type: 'user' },
        { id: 'user:t.nakamura', name: 't.nakamura', type: 'user' },
        { id: 'host:hr-lt-0233', name: 'HR-LT-0233', type: 'host' },
        { id: 'domain:hr-portal-login.example', name: 'hr-portal-login.example', type: 'domain' },
      ],
    },
    hypotheses: [
      {
        candidate: 'The lookalike page harvested credentials',
        confidence: 0.92,
        status: 'confirmed',
        reason: 'Proxy logs show two POSTs of a login form to the lookalike domain from internal users.',
      },
      {
        candidate: 'Attackers used the stolen credentials to read mail',
        confidence: 0.3,
        status: 'investigating',
        reason: 'One sign-in from a new ASN was seen for m.okafor after the POST; no mailbox access yet.',
      },
    ],
  },
  {
    n: 3,
    title: 'Impossible-travel sign-in for backup service account',
    status: 'open',
    severity: 'critical',
    summary:
      'The backup service account signed in from Frankfurt and from Lagos within 6 minutes. The Lagos session listed storage buckets and created an access key.',
    verdict: 'Account compromise. The service account credential was exposed; rotate it and review the new access key.',
    createdMinutesAgo: 75,
    updatedMinutesAgo: 12,
    subjects: [
      {
        type: 'alert',
        id: 'uipoc-alert-svc-backup-travel',
        summary: 'Impossible travel for svc-backup',
        snapshot: alertSnapshot({
          id: 'uipoc-alert-svc-backup-travel',
          ruleName: 'Impossible Travel Activity',
          reason: 'authentication event by svc-backup from two countries within 6 minutes.',
          minutesAgo: 80,
          user: 'svc-backup',
        }),
      },
    ],
    claimedSubject: 0,
    impact: {
      summary:
        'A service account with read access to all backup storage was used by an unknown party. A new access key exists that the owner did not create.',
      entities: [
        { id: 'user:svc-backup', name: 'svc-backup', type: 'user' },
        { id: 'host:bkp-gw-01', name: 'BKP-GW-01', type: 'host' },
        { id: 'service_account:svc-backup-key-2', name: 'svc-backup access key 2', type: 'service_account' },
        { id: 'user:l.adeyemi', name: 'l.adeyemi', type: 'user' },
      ],
    },
    hypotheses: [
      {
        candidate: 'The service account secret leaked from a CI log',
        confidence: 0.7,
        status: 'investigating',
        reason: 'The secret appears in a build log that was readable by all engineers for two days.',
      },
      {
        candidate: 'The owner traveled and used a VPN',
        confidence: 0.04,
        status: 'dismissed',
        reason: 'A service account has no interactive owner, and the Lagos session used a scripted user agent.',
      },
      {
        candidate: 'The attacker created persistence through a new access key',
        confidence: 0.88,
        status: 'confirmed',
        reason: 'CreateAccessKey was called 3 minutes after the first Lagos sign-in.',
      },
      {
        candidate: 'Backup data was copied out',
        confidence: 0.2,
        status: 'investigating',
        reason: 'Bucket listing only so far; object reads not seen in the audit log yet.',
      },
    ],
  },
  {
    n: 4,
    title: 'Repeated AV detection on build agent is a test fixture',
    status: 'closed',
    severity: 'low',
    summary:
      'Defender flagged an EICAR test string on BUILD-AGT-07 four times in an hour. The string belongs to the security test suite.',
    verdict: 'Benign: the detection comes from a scheduled test of the endpoint protection.',
    createdMinutesAgo: 1500,
    updatedMinutesAgo: 1440,
    subjects: [
      {
        type: 'alert',
        id: 'uipoc-alert-build-agt-07-eicar',
        summary: 'Malware prevention alert: EICAR-Test-File',
        snapshot: alertSnapshot({
          id: 'uipoc-alert-build-agt-07-eicar',
          ruleName: 'Malware Prevention Alert',
          reason: 'malware event on BUILD-AGT-07 by svc-ci created low alert EICAR-Test-File.',
          minutesAgo: 1510,
          host: 'BUILD-AGT-07',
          user: 'svc-ci',
        }),
      },
    ],
    claimedSubject: null,
    impact: {
      summary: 'No impact. The build agent was never at risk.',
      entities: [{ id: 'host:build-agt-07', name: 'BUILD-AGT-07', type: 'host' }],
    },
    hypotheses: [
      {
        candidate: 'The detection is the scheduled endpoint protection test',
        confidence: 0.97,
        status: 'confirmed',
        reason: 'The file path and the schedule match the security test suite in the CI repository.',
      },
      {
        candidate: 'Real malware reached the build agent',
        confidence: 0.02,
        status: 'dismissed',
        reason: 'The only hit is the EICAR test string; no other detections or network indicators.',
      },
    ],
  },
];

const conversationIdOf = ({ n }) => uuidv5Like(SEED_NAMESPACE, String(n));

// --- helpers ------------------------------------------------------------------------------------

const ensureSideIndices = async () => {
  for (const [name, properties] of Object.entries(SIDE_INDEX_MAPPINGS)) {
    const alias = await es('HEAD', `/_alias/${name}?expand_wildcards=all`, undefined, {
      okStatuses: [200, 404],
    });
    if (alias.status === 200) {
      log(`index ${name}: exists (reused)`);
      continue;
    }
    const tpl = await es('HEAD', `/_index_template/${name}`, undefined, { okStatuses: [200, 404] });
    if (tpl.status === 404) {
      await es('PUT', `/_index_template/${name}?create=true`, {
        index_patterns: [`${name}-*`],
        allow_auto_create: false,
        template: {
          settings: { number_of_shards: 1, auto_expand_replicas: '0-1' },
          mappings: { dynamic: 'strict', properties },
          aliases: { [name]: { is_write_index: true } },
        },
      });
    }
    const created = await es('PUT', `/${name}-000001`, undefined, { okStatuses: [200, 400] });
    if (created.status === 400 && created.json?.error?.type !== 'resource_already_exists_exception') {
      throw new Error(`Creating ${name}-000001 failed: ${created.text.slice(0, 400)}`);
    }
    log(`index ${name}: created (template + ${name}-000001)`);
  }
};

const resolveUser = async () => {
  try {
    const { json } = await kbn('GET', '/internal/security/me', undefined, { okStatuses: [200] });
    return {
      username: json.username,
      fullName: json.full_name ?? null,
      email: json.email ?? null,
      ...(json.profile_uid && { profileUid: json.profile_uid }),
    };
  } catch {
    return { username: 'elastic', fullName: null, email: null };
  }
};

const indexDoc = (index, id, doc) => es('PUT', `/${index}/_doc/${id}?refresh=wait_for`, doc);

const getConversation = async (id) => {
  const res = await kbn('GET', `/api/agent_builder/conversations/${id}`, undefined, {
    public: true,
    okStatuses: [200, 404],
  });
  return res.status === 200 ? res.json : undefined;
};

const attach = (conversationId, type, doc, description) =>
  kbn(
    'POST',
    `/api/agent_builder/conversations/${conversationId}/attachments`,
    {
      id: doc.id,
      type,
      origin: doc.id,
      data: doc,
      hidden: true,
      ...(description !== undefined && { description }),
    },
    { public: true }
  );

// --- seed / clean -------------------------------------------------------------------------------

const seedScenario = async (scenario, user) => {
  const conversationId = conversationIdOf(scenario);
  const base = {
    spaceId: SPACE_ID,
    conversationId,
    createdAt: iso(scenario.createdMinutesAgo),
    updatedAt: iso(scenario.updatedMinutesAgo),
    createdBy: user,
  };

  let conversation = await getConversation(conversationId);
  if (!conversation) {
    await kbn(
      'POST',
      '/api/agent_builder/conversations',
      {
        conversation_id: conversationId,
        agent_id: 'elastic-ai-agent',
        title: scenario.title,
        template_id: INVESTIGATION_TEMPLATE_ID,
        access_control: { access_mode: 'public' },
        metadata: {
          status: 'open',
          severity: scenario.severity,
          summary: scenario.summary,
          verdict: scenario.verdict,
        },
      },
      { public: true }
    );
    conversation = await getConversation(conversationId);
  }
  const attached = new Set((conversation?.attachments ?? []).map(({ id }) => id));
  const counts = { subjects: 0, claims: 0, impact: 0, hypotheses: 0, attached: 0 };

  for (const subject of scenario.subjects) {
    const id = subjectDocId(conversationId, subject);
    const doc = {
      ...base,
      subjectType: subject.type,
      subjectId: subject.id,
      summary: subject.summary,
      triggerType: subject.type === 'manual' ? 'manual' : 'automatic',
      ...(subject.snapshot && { snapshot: subject.snapshot }),
    };
    await indexDoc(SUBJECT_INDEX, id, doc);
    counts.subjects++;
    if (!attached.has(id)) {
      await attach(conversationId, SUBJECT_ATTACHMENT_TYPE, { ...doc, id });
      counts.attached++;
    }
  }

  if (scenario.claimedSubject !== null && scenario.claimedSubject !== undefined) {
    const subject = scenario.subjects[scenario.claimedSubject];
    await indexDoc(CLAIM_INDEX, claimDocId(subject), {
      spaceId: SPACE_ID,
      conversationId,
      subjectType: subject.type,
      subjectId: subject.id,
      claimedAt: base.createdAt,
    });
    counts.claims++;
  }

  {
    const id = impactDocId(conversationId);
    const doc = {
      ...base,
      summary: scenario.impact.summary,
      entities: scenario.impact.entities,
      entityIds: scenario.impact.entities.map((entity) => entity.id),
    };
    await indexDoc(IMPACT_INDEX, id, doc);
    counts.impact++;
    if (!attached.has(id)) {
      await attach(conversationId, IMPACT_ATTACHMENT_TYPE, { ...doc, id });
      counts.attached++;
    }
  }

  {
    const id = hypothesesDocId(conversationId);
    const doc = { ...base, hypotheses: scenario.hypotheses };
    await indexDoc(HYPOTHESES_INDEX, id, doc);
    counts.hypotheses++;
    if (!attached.has(id)) {
      await attach(conversationId, HYPOTHESES_ATTACHMENT_TYPE, { ...doc, id }, 'Hypotheses');
      counts.attached++;
    }
  }

  if (scenario.status === 'closed') {
    await kbn('PUT', `/internal/investigations/investigations/${conversationId}/status`, { status: 'closed' }, {
      headers: { 'elastic-api-version': '1' },
      okStatuses: [200, 204, 400, 404],
    });
  }

  // Agent Builder stamps the current time on writes; set the timeline last, straight to the doc.
  await es(
    'POST',
    `/${CONVERSATIONS_INDEX}/_update/${conversationId}?refresh=wait_for`,
    { doc: { created_at: base.createdAt, updated_at: base.updatedAt } },
    { okStatuses: [200, 404], auth: SYSTEM_AUTH }
  );

  return { conversationId, counts };
};

const clean = async () => {
  let removed = 0;
  for (const scenario of SCENARIOS) {
    const conversationId = conversationIdOf(scenario);
    const del = await kbn('DELETE', `/api/agent_builder/conversations/${conversationId}`, undefined, {
      public: true,
      okStatuses: [200, 204, 404],
    });
    if (del.status !== 404) removed++;

    const targets = [
      [SUBJECT_INDEX, scenario.subjects.map((subject) => subjectDocId(conversationId, subject))],
      [IMPACT_INDEX, [impactDocId(conversationId)]],
      [HYPOTHESES_INDEX, [hypothesesDocId(conversationId)]],
      [
        CLAIM_INDEX,
        scenario.claimedSubject === null || scenario.claimedSubject === undefined
          ? []
          : [claimDocId(scenario.subjects[scenario.claimedSubject])],
      ],
    ];
    for (const [index, ids] of targets) {
      for (const id of ids) {
        await es('DELETE', `/${index}/_doc/${id}?refresh=true`, undefined, { okStatuses: [200, 404] });
      }
    }
  }
  log(`clean: removed ${removed} seeded conversations and their side documents`);
};

const main = async () => {
  const args = parseArgs();
  if (args.clean) {
    await clean();
    return;
  }
  const user = await resolveUser();
  await ensureSideIndices();
  for (const scenario of SCENARIOS) {
    const { conversationId, counts } = await seedScenario(scenario, user);
    log(
      `seeded ${conversationId} "${scenario.title}" ` +
        `(subjects ${counts.subjects}, claims ${counts.claims}, impact ${counts.impact}, ` +
        `hypotheses ${counts.hypotheses}, newly attached ${counts.attached})`
    );
  }
  log(`done: ${SCENARIOS.length} investigations as ${user.username}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
