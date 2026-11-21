// One-shot, idempotent environment setup for the investigations POC.
//
//   node setup.mjs
//
// Env: KBN_URL (http://localhost:5602), UIPOC_ES_URL (http://localhost:9201), KBN_AUTH (elastic:changeme),
//      MOCK_PORT (18555, only used to build the mock connector URL)
import { kbn, es, waitForKibana, log, KBN, ES } from './lib/client.mjs';

const MOCK_PORT = process.env.MOCK_PORT ?? '18555';
const CONNECTOR_ID = 'uipoc-mock-llm';
const AGENT_ID = 'cases-investigation-agent';
const OWNER = 'securitySolution';
const PASSWORD = 'changeme';

// Setting ids (src/platform/packages/shared/kbn-management/settings/setting_ids/index.ts).
const SETTING_DEFAULT_CONNECTOR = 'genAiSettings:defaultAIConnector';
const SETTING_DEFAULT_CONNECTOR_ONLY = 'genAiSettings:defaultAIConnectorOnly';
const SETTING_CHAT_EXPERIENCE = 'aiAssistant:preferredChatExperience';

const TOOL_IDS = [
  'platform.core.cases.investigation_read_items',
  'platform.core.cases.investigation_add_evidence',
  'platform.core.cases.investigation_upsert_claim',
  'platform.core.cases.investigation_set_task_status',
  'platform.core.cases.investigation_upsert_entity',
  'platform.core.cases.investigation_propose_action',
  'platform.core.cases.investigation_update_record',
  'platform.core.cases',
];

const summary = [];
const record = (step, item, status, detail = '') => {
  summary.push({ step, item, status, detail });
  log(`${status.padEnd(8)} ${step}: ${item}${detail ? ` - ${detail}` : ''}`);
};
const messageOf = (e) => (e.json?.message ?? e.json?.error?.message ?? e.message ?? String(e)).toString().slice(0, 400);

// ---------------------------------------------------------------------------------------------
// 2. Users and roles
// ---------------------------------------------------------------------------------------------
const POC_USERS = [
  ['braxton.w', 'Braxton W.'],
  ['priya.k', 'Priya K.'],
  ['dana.r', 'Dana R.'],
  ['marcus.r', 'Marcus R.'],
  ['aisha.l', 'Aisha L.'],
  ['jun.t', 'Jun T.'],
];

const latestFeatureId = (features, pattern) => {
  const matches = features
    .map((f) => ({ id: f.id, version: Number(f.id.match(pattern)?.[1]) }))
    .filter((f) => Number.isFinite(f.version));
  matches.sort((a, b) => b.version - a.version);
  return matches[0]?.id;
};

const putUser = async (username, fullName, roles) => {
  const exists = (await es('GET', `/_security/user/${username}`, undefined, { okStatuses: [200, 404] })).status === 200;
  await es('PUT', `/_security/user/${username}`, {
    password: PASSWORD,
    roles,
    full_name: fullName,
    email: `${username}@example.com`,
  });
  record('users', username, exists ? 'existed' : 'created', `roles=${roles.join(',')}`);
};

// The user picker control suggests user profiles, and a profile only exists once the user has signed in.
// Activating it through the ES profile API creates the same profile a login would.
const activateProfile = async (username) => {
  const { json } = await es('POST', '/_security/profile/_activate', { grant_type: 'password', username, password: PASSWORD });
  record('profiles', username, 'activated', json?.uid ?? '');
};

const setupUsers = async () => {
  for (const [username, fullName] of POC_USERS) {
    try {
      await putUser(username, fullName, ['superuser']);
      await activateProfile(username);
    } catch (e) {
      record('users', username, 'failed', messageOf(e));
    }
  }

  try {
    const { json: features } = await kbn('GET', '/api/features');
    const casesFeature = latestFeatureId(features, /^securitySolutionCasesV(\d+)$/);
    const securityFeature = latestFeatureId(features, /^siemV(\d+)$/);
    if (!casesFeature || !securityFeature) {
      throw new Error(`could not find Security cases/Security features (cases=${casesFeature}, security=${securityFeature})`);
    }
    log(`using feature ids: cases=${casesFeature}, security=${securityFeature}`);

    const role = await kbn('GET', '/api/security/role/uipoc_cases_read', undefined, { okStatuses: [200, 404] });
    await kbn('PUT', '/api/security/role/uipoc_cases_read', {
      elasticsearch: { cluster: [], indices: [] },
      kibana: [
        {
          base: [],
          feature: { [casesFeature]: ['read'], [securityFeature]: ['read'] },
          spaces: ['*'],
        },
      ],
    }, { public: true });
    record('roles', 'uipoc_cases_read', role.status === 200 ? 'updated' : 'created', `${casesFeature}:read, ${securityFeature}:read`);

    await putUser('viewer.v', 'Viewer V.', ['uipoc_cases_read']);
  } catch (e) {
    record('roles', 'uipoc_cases_read / viewer.v', 'failed', messageOf(e));
  }
};

// ---------------------------------------------------------------------------------------------
// 3-4. Mock connector and default AI settings
// ---------------------------------------------------------------------------------------------
const setupConnector = async () => {
  const config = {
    apiProvider: 'OpenAI',
    apiUrl: `http://localhost:${MOCK_PORT}/v1/chat/completions`,
    defaultModel: 'gpt-4o',
  };
  const secrets = { apiKey: 'not-a-real-key' };
  const name = 'POC mock model';
  try {
    const existing = await kbn('GET', `/api/actions/connector/${CONNECTOR_ID}`, undefined, { okStatuses: [200, 404] });
    if (existing.status === 200) {
      await kbn('PUT', `/api/actions/connector/${CONNECTOR_ID}`, { name, config, secrets }, { public: true });
      record('connector', CONNECTOR_ID, 'updated', config.apiUrl);
    } else {
      await kbn('POST', `/api/actions/connector/${CONNECTOR_ID}`, {
        name,
        connector_type_id: '.gen-ai',
        config,
        secrets,
      }, { public: true });
      record('connector', CONNECTOR_ID, 'created', config.apiUrl);
    }
  } catch (e) {
    record('connector', CONNECTOR_ID, 'failed', messageOf(e));
  }
};

const setupSettings = async () => {
  try {
    const changes = {
      [SETTING_DEFAULT_CONNECTOR]: CONNECTOR_ID,
      [SETTING_DEFAULT_CONNECTOR_ONLY]: true,
      [SETTING_CHAT_EXPERIENCE]: 'agent',
    };
    await kbn('POST', '/internal/kibana/settings', { changes });
    const { json } = await kbn('GET', '/internal/kibana/settings');
    const current = json?.settings ?? {};
    const got = Object.keys(changes).map((k) => `${k.split(':')[1]}=${JSON.stringify(current[k]?.userValue)}`);
    record('settings', 'default AI connector + agent chat', 'updated', got.join(', '));
  } catch (e) {
    record('settings', 'default AI connector + agent chat', 'failed', messageOf(e));
  }
};

// ---------------------------------------------------------------------------------------------
// 5. Agent Builder agent
// ---------------------------------------------------------------------------------------------
const setupAgent = async () => {
  const body = {
    name: 'Investigation agent',
    description: 'Works security investigations: reads and writes evidence, claims, tasks and scope.',
    configuration: {
      instructions:
        'You help analysts work a security investigation. Use the investigation tools to read and change the record. Keep answers short.',
      tools: [{ tool_ids: TOOL_IDS }],
    },
  };
  try {
    const existing = await kbn('GET', `/api/agent_builder/agents/${AGENT_ID}`, undefined, { okStatuses: [200, 404] });
    if (existing.status === 200) {
      await kbn('PUT', `/api/agent_builder/agents/${AGENT_ID}`, body, { public: true });
      record('agent', AGENT_ID, 'updated');
    } else {
      await kbn('POST', '/api/agent_builder/agents', { id: AGENT_ID, ...body }, { public: true });
      record('agent', AGENT_ID, 'created');
    }
  } catch (e) {
    const message = messageOf(e);
    if (/tool/i.test(message)) {
      log(`WARNING: agent not saved because the investigation tools are not registered yet. Re-run setup once they are.\n  ${message}`);
      record('agent', AGENT_ID, 'pending', 'tools not registered yet; re-run later');
    } else {
      record('agent', AGENT_ID, 'failed', message);
    }
  }
};

// ---------------------------------------------------------------------------------------------
// 6. Investigation-type templates (Cases templates v2)
// ---------------------------------------------------------------------------------------------
// An investigation type is a Cases template of owner securitySolution tagged `investigation-type`. The template
// names are fixed: the server picks the procedure template (default tasks) whose key equals the template name.
// Across the four templates every field control and every validation rule is used at least once.
const INVESTIGATION_TYPE_TAG = 'investigation-type';

const BUSINESS_UNITS = [
  'IT Infrastructure',
  'Engineering',
  'Finance',
  'Data Platform',
  'Sales',
  'Support',
  'Legal',
  'HR',
  'Operations',
  'Marketing',
];
const TICKET_PATTERN = { regex: '^[A-Z]{2,10}-\\d{1,8}$', message: 'Use a ticket id like SEC-1234 (2-10 capital letters, a dash, 1-8 digits).' };
const SHA256_PATTERN = { regex: '^[a-fA-F0-9]{64}$', message: 'Enter a SHA-256 hash: exactly 64 hexadecimal characters.' };
const EMAIL_PATTERN = { regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$', message: 'Enter a full sender address like billing@example.com.' };

/** Serializes plain objects, arrays and scalars to YAML (strings are JSON-quoted, which is valid YAML). */
const toYaml = (value, indent = 0) => {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item !== null && typeof item === 'object') {
          const [first, ...rest] = toYaml(item, indent + 2).split('\n');
          return [`${pad}- ${first.trimStart()}`, ...rest].join('\n');
        }
        return `${pad}- ${JSON.stringify(item)}`;
      })
      .join('\n');
  }
  return Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .map(([key, v]) => {
      if (v !== null && typeof v === 'object') return `${pad}${key}:\n${toYaml(v, indent + 2)}`;
      return `${pad}${key}: ${JSON.stringify(v)}`;
    })
    .join('\n');
};

const field = (name, label, control, type, extra = {}) => ({ name, label, type, control, ...extra });
const whenEquals = (name, value) => ({ field: name, operator: 'eq', value });

const guidance = (content) => field('guidance', 'Guidance', 'MARKDOWN', 'keyword', { metadata: { content } });
const businessUnit = () =>
  field('business_unit', 'Business unit', 'SELECT_BASIC', 'keyword', { metadata: { options: BUSINESS_UNITS } });
const impact = () =>
  field('impact', 'Impact', 'INPUT_TEXT', 'keyword', { validation: { required_on_close: true, max_length: 200 } });
const dataClassification = () =>
  field('data_classification', 'Data classification', 'SELECT_BASIC', 'keyword', {
    metadata: { options: ['Public', 'Internal', 'Confidential', 'SOX, restricted'], default: 'Internal' },
    validation: { required: true },
  });
const ticket = () =>
  field('ticket', 'Ticket', 'INPUT_TEXT', 'keyword', { validation: { pattern: TICKET_PATTERN } });
const rootCauseNotes = () =>
  field('root_cause_notes', 'Root cause notes', 'TEXTAREA', 'keyword', {
    validation: { required_on_close: true, min_length: 20, max_length: 2000 },
  });

const FIELD_SETS = {
  Malware: [
    guidance(
      '**Malware handling.** Isolate before you collect. Record the SHA-256 of every dropped file and note the behaviors you observed. Close only after the remediation and root cause are written down.'
    ),
    businessUnit(),
    impact(),
    dataClassification(),
    ticket(),
    field('file_hash', 'File hash', 'INPUT_TEXT', 'keyword', { validation: { pattern: SHA256_PATTERN } }),
    field('hosts_affected', 'Hosts affected', 'INPUT_NUMBER', 'integer', { validation: { min: 0, max: 10000 } }),
    field('observed_behaviors', 'Observed behaviors', 'CHECKBOX_GROUP', 'keyword', {
      metadata: {
        options: ['Persistence', 'Credential access', 'Lateral movement', 'Command and control', 'Data staging', 'Defense evasion'],
      },
    }),
    field('containment_done', 'Containment done', 'TOGGLE', 'boolean', { metadata: { default: false } }),
    field('contained_at', 'Contained at', 'DATE_PICKER', 'date', {
      metadata: { show_time: true, timezone: 'utc' },
      display: { show_when: whenEquals('containment_done', true) },
      validation: { required_when: whenEquals('containment_done', true) },
    }),
    field('remediation', 'Remediation', 'SELECT_BASIC', 'keyword', {
      metadata: { options: ['Reimaged host', 'Removed malware', 'Isolated and monitoring', 'No action needed'] },
      validation: { required_on_close: true },
    }),
    rootCauseNotes(),
  ],
  Phishing: [
    guidance(
      '**Phishing report.** Capture the sender and when it was reported, then count everyone who received the message. Ask escalation contacts to confirm before you purge mailboxes.'
    ),
    businessUnit(),
    impact(),
    dataClassification(),
    ticket(),
    field('sender', 'Sender', 'INPUT_TEXT', 'keyword', { validation: { pattern: EMAIL_PATTERN } }),
    field('reported_at', 'Reported at', 'DATE_PICKER', 'date', { metadata: { show_time: true, timezone: 'utc' } }),
    field('affected_users', 'Affected users', 'INPUT_NUMBER', 'integer', { validation: { min: 0, max: 100000 } }),
    field('link_clicked', 'Link clicked', 'TOGGLE', 'boolean', { metadata: { default: false } }),
    field('clicked_users', 'Users who clicked', 'INPUT_NUMBER', 'integer', {
      display: { show_when: whenEquals('link_clicked', true) },
      validation: { required_when: whenEquals('link_clicked', true), min: 1, max: 100000 },
    }),
    field('credentials_entered', 'Credentials entered', 'RADIO_GROUP', 'keyword', {
      metadata: { options: ['Yes', 'No', 'Unknown'], default: 'Unknown' },
    }),
    field('escalation_contacts', 'Escalation contacts', 'USER_PICKER', 'keyword', { metadata: { multiple: true } }),
    field('purge_status', 'Mailbox purge', 'RADIO_GROUP', 'keyword', {
      metadata: { options: ['Purged', 'Pending', 'Not needed'] },
      validation: { required_on_close: true },
    }),
    rootCauseNotes(),
  ],
  'Account compromise': [
    guidance(
      '**Account compromise.** List every business unit the actor touched and whether data left the environment. Rotate credentials before you close.'
    ),
    businessUnit(),
    impact(),
    dataClassification(),
    ticket(),
    field('affected_units', 'Affected business units', 'CHECKBOX_GROUP', 'keyword', { metadata: { options: BUSINESS_UNITS } }),
    field('data_exfiltrated', 'Data exfiltrated', 'RADIO_GROUP', 'keyword', {
      metadata: { options: ['Yes', 'No', 'Unknown'], default: 'Unknown' },
    }),
    field('exfiltration_volume_gb', 'Exfiltration volume (GB)', 'INPUT_NUMBER', 'double', {
      display: { show_when: whenEquals('data_exfiltrated', 'Yes') },
      validation: { required_when: whenEquals('data_exfiltrated', 'Yes'), min: 0, max: 100000 },
    }),
    field('escalation_contacts', 'Escalation contacts', 'USER_PICKER', 'keyword', { metadata: { multiple: true } }),
    field('credentials_reset', 'Credentials reset', 'RADIO_GROUP', 'keyword', {
      metadata: { options: ['Yes', 'No', 'Not needed'] },
      validation: { required_on_close: true },
    }),
    rootCauseNotes(),
  ],
  'Alert triage': [
    guidance('**Alert triage.** Group related alerts, decide quickly, and record what you would tune so the next shift sees less noise.'),
    businessUnit(),
    impact(),
    dataClassification(),
    ticket(),
    field('alert_count', 'Alert count', 'INPUT_NUMBER', 'integer', { validation: { min: 1, max: 100000 } }),
    field('reviewer', 'Reviewer', 'USER_PICKER', 'keyword', { metadata: { multiple: false } }),
    field('tuning_action', 'Tuning action', 'SELECT_BASIC', 'keyword', {
      metadata: { options: ['None', 'Tune the rule', 'Add an exception', 'Hand to detection engineering'] },
      validation: { required_on_close: true },
    }),
    rootCauseNotes(),
  ],
};

const templateYaml = ({ title, severity, tag, fields }) =>
  toYaml({
    name: title,
    severity,
    tags: [tag],
    settings: { syncAlerts: true },
    fields,
  });

const TEMPLATES = [
  {
    name: 'Malware',
    description: 'Investigate a suspected malware infection on one or more hosts.',
    yaml: templateYaml({ title: 'Malware investigation', severity: 'high', tag: 'malware', fields: FIELD_SETS.Malware }),
  },
  {
    name: 'Phishing',
    description: 'Investigate a reported or detected phishing message and its recipients.',
    yaml: templateYaml({ title: 'Phishing investigation', severity: 'medium', tag: 'phishing', fields: FIELD_SETS.Phishing }),
  },
  {
    name: 'Account compromise',
    description: 'Investigate suspected takeover of a user or service account.',
    yaml: templateYaml({
      title: 'Account compromise investigation',
      severity: 'high',
      tag: 'account-compromise',
      fields: FIELD_SETS['Account compromise'],
    }),
  },
  {
    name: 'Alert triage',
    description: 'Triage a group of related alerts and decide whether to escalate.',
    yaml: templateYaml({ title: 'Alert triage', severity: 'low', tag: 'alert-triage', fields: FIELD_SETS['Alert triage'] }),
  },
];

const setupTemplates = async () => {
  let existing;
  try {
    const { json } = await kbn('GET', `/api/cases/templates?owner=${OWNER}&perPage=100`, undefined, { public: true });
    existing = new Map((json?.templates ?? []).map((t) => [t.name.toLowerCase(), t]));
  } catch (e) {
    record('templates', 'list existing', 'failed', messageOf(e));
    return;
  }

  for (const template of TEMPLATES) {
    const body = {
      owner: OWNER,
      name: template.name,
      description: template.description,
      tags: [INVESTIGATION_TYPE_TAG],
      definition: template.yaml,
    };
    const current = existing.get(template.name.toLowerCase());
    const dryPath = current
      ? `/api/cases/templates/${current.templateId}?dry_run=true`
      : '/api/cases/templates?dry_run=true';
    try {
      if (
        current &&
        (current.definitionString ?? '').trim() === template.yaml.trim() &&
        current.description === template.description &&
        (current.tags ?? []).includes(INVESTIGATION_TYPE_TAG) &&
        current.isEnabled !== false
      ) {
        record('templates', template.name, 'unchanged', `v${current.templateVersion}`);
        continue;
      }
      const dry = await kbn(current ? 'PUT' : 'POST', dryPath, body, { public: true, okStatuses: [200, 400, 409] });
      if (dry.status !== 200) {
        console.error(`Template "${template.name}" failed validation:\n${dry.text}\n--- YAML ---\n${template.yaml}`);
        record('templates', template.name, 'failed', `validation (${dry.status}): ${dry.text.slice(0, 300)}`);
        continue;
      }
      if (current) {
        const { json } = await kbn('PUT', `/api/cases/templates/${current.templateId}`, { ...body, isEnabled: true }, { public: true });
        record('templates', template.name, 'updated', `v${current.templateVersion} -> v${json?.templateVersion}`);
      } else {
        const { json } = await kbn('POST', '/api/cases/templates', body, { public: true });
        record('templates', template.name, 'created', `v${json?.templateVersion}`);
      }
    } catch (e) {
      record('templates', template.name, 'failed', messageOf(e));
    }
  }
};

// ---------------------------------------------------------------------------------------------
const main = async () => {
  log(`Kibana ${KBN}  ES ${ES}`);
  log('waiting for Kibana...');
  const status = await waitForKibana();
  log(`Kibana ${status.version?.number} is available`);

  await setupUsers();
  await setupConnector();
  await setupSettings();
  await setupAgent();
  await setupTemplates();

  console.log('\nSummary');
  console.table(summary);
  const failed = summary.filter((s) => s.status === 'failed');
  const pending = summary.filter((s) => s.status === 'pending');
  if (pending.length) console.log(`Pending: ${pending.map((p) => `${p.step}:${p.item}`).join(', ')}`);
  if (failed.length) {
    console.error(`Failed: ${failed.map((p) => `${p.step}:${p.item}`).join(', ')}`);
    process.exitCode = 1;
  }
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
