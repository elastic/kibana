// One-shot, idempotent environment setup for the investigations POC.
//
//   node setup.mjs
//
// Env: KBN_URL (http://localhost:5602), ES_URL (http://localhost:9201), KBN_AUTH (elastic:changeme),
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

const setupUsers = async () => {
  for (const [username, fullName] of POC_USERS) {
    try {
      await putUser(username, fullName, ['superuser']);
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
// 6. Investigation-type templates
// ---------------------------------------------------------------------------------------------
const textField = (name, label) =>
  `  - name: ${name}\n    label: ${label}\n    type: keyword\n    control: INPUT_TEXT\n`;

const templateYaml = ({ title, severity, tag, extraFields }) =>
  [
    `name: ${title}`,
    `severity: ${severity}`,
    'tags:',
    `  - ${tag}`,
    'settings:',
    '  syncAlerts: true',
    'fields:',
    textField('business_unit', 'Business unit') +
      textField('impact', 'Impact') +
      [
        '  - name: data_classification',
        '    label: Data classification',
        '    type: keyword',
        '    control: SELECT_BASIC',
        '    metadata:',
        '      options:',
        '        - Public',
        '        - Internal',
        '        - Confidential',
        '        - "SOX, restricted"',
        '      default: Internal',
        '',
      ].join('\n') +
      textField('ticket', 'Ticket') +
      extraFields,
  ].join('\n');

const TEMPLATES = [
  {
    name: 'Malware',
    description: 'Investigate a suspected malware infection on one or more hosts.',
    yaml: templateYaml({
      title: 'Malware investigation',
      severity: 'high',
      tag: 'malware',
      extraFields: textField('file_hash', 'File hash'),
    }),
  },
  {
    name: 'Phishing',
    description: 'Investigate a reported or detected phishing message and its recipients.',
    yaml: templateYaml({
      title: 'Phishing investigation',
      severity: 'medium',
      tag: 'phishing',
      extraFields: textField('sender', 'Sender'),
    }),
  },
  {
    name: 'Account compromise',
    description: 'Investigate suspected takeover of a user or service account.',
    yaml: templateYaml({ title: 'Account compromise investigation', severity: 'high', tag: 'account-compromise', extraFields: '' }),
  },
  {
    name: 'Alert triage',
    description: 'Triage a group of related alerts and decide whether to escalate.',
    yaml: templateYaml({ title: 'Alert triage', severity: 'low', tag: 'alert-triage', extraFields: '' }),
  },
];

const setupTemplates = async () => {
  let existingNames;
  try {
    const { json } = await kbn('GET', `/api/cases/templates?owner=${OWNER}&perPage=100`, undefined, { public: true });
    existingNames = new Set((json?.templates ?? []).map((t) => t.name.toLowerCase()));
  } catch (e) {
    record('templates', 'list existing', 'failed', messageOf(e));
    return;
  }

  for (const template of TEMPLATES) {
    if (existingNames.has(template.name.toLowerCase())) {
      record('templates', template.name, 'existed');
      continue;
    }
    const body = {
      owner: OWNER,
      name: template.name,
      description: template.description,
      tags: ['investigation-type'],
      definition: template.yaml,
    };
    try {
      const dry = await kbn('POST', '/api/cases/templates?dry_run=true', body, { public: true, okStatuses: [200, 400, 409] });
      if (dry.status === 409) {
        record('templates', template.name, 'existed', 'name conflict on dry run');
        continue;
      }
      if (dry.status !== 200) {
        console.error(`Template "${template.name}" failed validation:\n${dry.text}\n--- YAML ---\n${template.yaml}`);
        record('templates', template.name, 'failed', `validation: ${dry.text.slice(0, 300)}`);
        continue;
      }
      await kbn('POST', '/api/cases/templates', body, { public: true });
      record('templates', template.name, 'created');
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
