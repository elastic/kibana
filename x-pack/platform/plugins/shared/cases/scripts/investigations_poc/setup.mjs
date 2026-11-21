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

// Cases Webhook connector to the local fake ticketing system (ticket_server.mjs).
const TICKETS_URL = process.env.UIPOC_TICKETS_URL ?? 'http://127.0.0.1:9300';
const TICKET_CONNECTOR_ID = 'uipoc-tickets';
const ticketConnectorConfig = () => {
  const ticket = `${TICKETS_URL}/tickets/{{{external.system.id}}}`;
  const body =
    '{"title":{{{case.title}}},"description":{{{case.description}}},"tags":{{{case.tags}}},"severity":{{{case.severity}}}}';
  return {
    createIncidentUrl: `${TICKETS_URL}/tickets`,
    createIncidentMethod: 'post',
    createIncidentJson: body,
    createIncidentResponseKey: 'id',
    getIncidentUrl: ticket,
    getIncidentMethod: 'get',
    getIncidentResponseExternalTitleKey: 'key',
    viewIncidentUrl: `${ticket}/view`,
    updateIncidentUrl: ticket,
    updateIncidentMethod: 'put',
    updateIncidentJson: body,
    createCommentUrl: `${ticket}/comments`,
    createCommentMethod: 'post',
    createCommentJson: '{"body":{{{case.comment}}}}',
    hasAuth: false,
  };
};

const setupTicketConnector = async () => {
  const name = 'UIPOC Ticketing';
  const config = ticketConnectorConfig();
  try {
    const existing = await kbn('GET', `/api/actions/connector/${TICKET_CONNECTOR_ID}`, undefined, {
      okStatuses: [200, 404],
    });
    if (existing.status === 200) {
      await kbn('PUT', `/api/actions/connector/${TICKET_CONNECTOR_ID}`, { name, config, secrets: {} }, { public: true });
      record('connector', TICKET_CONNECTOR_ID, 'updated', TICKETS_URL);
    } else {
      await kbn(
        'POST',
        `/api/actions/connector/${TICKET_CONNECTOR_ID}`,
        { name, connector_type_id: '.cases-webhook', config, secrets: {} },
        { public: true }
      );
      record('connector', TICKET_CONNECTOR_ID, 'created', TICKETS_URL);
    }
    // Other connectors with the same name (made by hand earlier) would show twice in the picker.
    const { json } = await kbn('GET', '/api/actions/connectors', undefined, { public: true });
    for (const c of json ?? []) {
      if (c.name === name && c.id !== TICKET_CONNECTOR_ID) {
        await kbn('DELETE', `/api/actions/connector/${c.id}`, undefined, { public: true, okStatuses: [204, 404] });
        record('connector', c.id, 'deleted', 'duplicate ticket connector');
      }
    }
  } catch (e) {
    record('connector', TICKET_CONNECTOR_ID, 'failed', messageOf(e));
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
    validation: { required_on_close: true, max_length: 2000 },
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
    // Cases' text controls treat an empty value as too short, so the minimum length lives on a
    // field that is only shown (and validated) once it is needed.
    field('containment_notes', 'Containment notes', 'TEXTAREA', 'keyword', {
      display: { show_when: whenEquals('containment_done', true) },
      validation: {
        required_when: whenEquals('containment_done', true),
        min_length: 20,
        max_length: 2000,
      },
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
// 7. Statuses and pause reasons (PUT _statuses)
// ---------------------------------------------------------------------------------------------
// Rules (common/investigations/statuses.ts): the three built-ins stay, a status can only be disabled (never removed),
// custom statuses may not be default, and a pausing status needs a pause reason. The config is read first, existing
// keys are kept, and anything beyond the POC set is disabled, so a re-run changes nothing.
const WAITING_STATUS = {
  key: 'waiting_on_the_employee',
  label: 'Waiting on the employee',
  category: 'in-progress',
  isDefault: false,
  pausesTimeTracking: true,
};
// DEFAULT_CASE_PAUSE_REASONS in common/investigations/statuses.ts, plus the POC reason.
const DEFAULT_CASE_PAUSE_REASONS = ['Awaiting customer', 'Awaiting vendor', 'Awaiting another team', 'Scheduled work'];
const PAUSE_REASONS = [...DEFAULT_CASE_PAUSE_REASONS, "Waiting on the employee's reply"];
const BUILT_IN_KEYS = ['open', 'in-progress', 'closed'];

const buildStatuses = (current) => {
  const byKey = new Map(current.map((s) => [s.key, s]));
  const nextOrder = Math.max(-1, ...current.map((s) => s.order ?? 0)) + 1;
  const out = current.map((status) => {
    // Built-ins are the category defaults again (someone may have moved the default to a custom status).
    if (BUILT_IN_KEYS.includes(status.key)) return { ...status, isDefault: true, disabled: false };
    if (status.key === WAITING_STATUS.key) {
      return { ...status, label: WAITING_STATUS.label, category: WAITING_STATUS.category, isDefault: false, disabled: false, pausesTimeTracking: true };
    }
    // Any other custom status stays (statuses cannot be removed) but is disabled and no longer a default.
    return { ...status, isDefault: false, disabled: true };
  });
  if (!byKey.has(WAITING_STATUS.key)) out.push({ ...WAITING_STATUS, order: nextOrder, disabled: false });
  return out;
};

const setupStatuses = async () => {
  try {
    const { json: current } = await kbn('GET', '/internal/cases/investigations/_statuses');
    const statuses = buildStatuses(current.statuses ?? []);
    const unchanged =
      JSON.stringify(statuses) === JSON.stringify(current.statuses) &&
      JSON.stringify(PAUSE_REASONS) === JSON.stringify(current.pauseReasons);
    if (unchanged) {
      record('statuses', 'statuses and pause reasons', 'unchanged', `${statuses.length} statuses, ${PAUSE_REASONS.length} pause reasons`);
      return;
    }
    const { json } = await kbn('PUT', '/internal/cases/investigations/_statuses', {
      statuses,
      pauseReasons: PAUSE_REASONS,
      version: current.version ?? null,
    });
    const disabled = json.statuses.filter((s) => s.disabled).map((s) => s.key);
    record(
      'statuses',
      'statuses and pause reasons',
      'updated',
      `enabled: ${json.statuses.filter((s) => !s.disabled).map((s) => s.key).join(', ')}${disabled.length ? `; disabled: ${disabled.join(', ')}` : ''}`
    );
  } catch (e) {
    record('statuses', 'statuses and pause reasons', 'failed', messageOf(e));
  }
};

// ---------------------------------------------------------------------------------------------
// 7b. Custom close reason
// ---------------------------------------------------------------------------------------------
// A close reason that is not one of the Cases defaults must be configured in the Security Solution advanced setting
// `securitySolution:detectionsCloseReasons`; the Cases close route (the owner's close reason validator) refuses any other.
// The setting is sensitive, so its value cannot be read back: setup writes the POC list as it is.
const SETTING_CLOSE_REASONS = 'securitySolution:detectionsCloseReasons';
const CUSTOM_CLOSE_REASONS = ['Resolved and remediated'];

const setupCloseReasons = async () => {
  try {
    await kbn('POST', '/internal/kibana/settings', { changes: { [SETTING_CLOSE_REASONS]: CUSTOM_CLOSE_REASONS } });
    record('close reasons', 'custom close reason', 'updated', CUSTOM_CLOSE_REASONS.join(', '));
  } catch (e) {
    record('close reasons', 'custom close reason', 'failed', messageOf(e));
  }
};

// ---------------------------------------------------------------------------------------------
// 8. Procedure task list for the Phishing type (PUT _procedure_templates/<template_id>)
// ---------------------------------------------------------------------------------------------
// Based on DEFAULT_PROCEDURE_TEMPLATES.Phishing (server/investigations/default_templates.ts), with a priority and a
// due-within time on each task and one task that has subtasks.
const procedureTask = (title, phase, description, required, ownerType, extra = {}) => ({
  title,
  phase,
  description,
  required,
  owner_type: ownerType,
  owner: null,
  auto: null,
  after: null,
  ...extra,
});
const claimAuto = (question) => ({ auto: { type: 'claim', question } });

const PHISHING_PROCEDURE = [
  procedureTask('Retrieve the reported email and its headers', 'Triage', 'Pull the original message and routing headers.', true, 'agent', {
    priority: 'high',
    due_within: { value: 1, unit: 'hours' },
  }),
  procedureTask('Identify every recipient', 'Triage', 'Search mailboxes for the same message.', true, 'agent', {
    priority: 'high',
    due_within: { value: 4, unit: 'hours' },
  }),
  procedureTask('Did any recipient click the link?', 'Investigate', 'Settled by a claim.', true, 'agent', {
    ...claimAuto('Did any recipient click the link?'),
    priority: 'high',
    due_within: { value: 8, unit: 'hours' },
  }),
  procedureTask('Did any recipient enter credentials?', 'Investigate', 'Settled by a claim.', true, 'agent', {
    ...claimAuto('Did any recipient enter credentials?'),
    priority: 'critical',
    due_within: { value: 8, unit: 'hours' },
  }),
  procedureTask('Block the sender and the URL', 'Contain', 'Done when a blocking action is approved.', true, 'person', {
    auto: { type: 'action', category: 'Block' },
    priority: 'high',
    due_within: { value: 1, unit: 'days' },
  }),
  procedureTask('Reset the passwords of affected users', 'Eradicate and recover', 'Reset and revoke sessions.', true, 'person', {
    priority: 'high',
    due_within: { value: 2, unit: 'days' },
    subtasks: [
      { title: 'Revoke active sessions and tokens', description: 'Sign the affected users out everywhere.', priority: 'high', required: true, due_within: { value: 1, unit: 'days' } },
      { title: 'Confirm the new passwords with each user', description: null, priority: 'medium', required: false, due_within: { value: 2, unit: 'days' } },
    ],
  }),
  procedureTask('Purge the message from all mailboxes', 'Eradicate and recover', 'Remove the message after approval.', false, 'automation', {
    priority: 'medium',
    due_within: { value: 2, unit: 'days' },
  }),
  procedureTask('Notify affected users', 'Close out', 'Tell users what happened and what to do.', false, 'person', {
    priority: 'low',
    due_within: { value: 3, unit: 'days' },
  }),
  procedureTask('Record the root cause and write the closing summary', 'Close out', 'Plain language, for readers outside the SOC.', true, 'person', {
    priority: 'medium',
    due_within: { value: 5, unit: 'days' },
  }),
];

const setupProcedure = async () => {
  try {
    const { json: types } = await kbn('GET', '/internal/cases/investigations/_types');
    const phishing = (types.types ?? types).find((t) => t.name === 'Phishing');
    if (!phishing) throw new Error('the Phishing type is missing (template step failed?)');
    const { json: listed } = await kbn('GET', '/internal/cases/investigations/_procedure_templates');
    const current = (listed.templates ?? []).find((t) => t.template_id === phishing.template_id);
    if (current?.saved && JSON.stringify(current.tasks) === JSON.stringify(PHISHING_PROCEDURE)) {
      record('procedure', 'Phishing task list', 'unchanged', `${PHISHING_PROCEDURE.length} tasks`);
      return;
    }
    await kbn('PUT', `/internal/cases/investigations/_procedure_templates/${encodeURIComponent(phishing.template_id)}`, { tasks: PHISHING_PROCEDURE });
    record('procedure', 'Phishing task list', current?.saved ? 'updated' : 'created', `${PHISHING_PROCEDURE.length} tasks, template ${phishing.template_id}`);
  } catch (e) {
    record('procedure', 'Phishing task list', 'failed', messageOf(e));
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
  await setupTicketConnector();
  await setupSettings();
  await setupAgent();
  await setupTemplates();
  await setupStatuses();
  await setupCloseReasons();
  await setupProcedure();

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
