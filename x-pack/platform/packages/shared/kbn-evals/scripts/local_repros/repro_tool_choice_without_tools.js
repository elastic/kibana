#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Local repro: trigger the gateway/Anthropic error when `tool_choice` is sent without `tools`.
 *
 * Usage (after starting Kibana + setting KIBANA_TESTING_INFERENCE_ENDPOINTS):
 *   node x-pack/platform/packages/shared/kbn-evals/scripts/local_repros/repro_tool_choice_without_tools.js \
 *     --connector-id openrouter-anthropic-claude-opus-4-5 \
 *     --kibana-url http://localhost:5620
 *
 * Notes:
 * - This script creates the inference endpoint described by the KIBANA_TESTING_INFERENCE_ENDPOINTS
 *   definition, then calls /internal/inference/chat_complete with
 *   toolChoice:"auto" and no tools. EIS definitions (provider: elastic) are assumed to be provisioned
 *   already and are never created.
 * - Do NOT print connector secrets.
 */

const INFERENCE_ENDPOINT_INTERNAL_API_VERSION = '1';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--connector-id') out.connectorId = argv[++i];
    else if (a === '--kibana-url') out.kibanaUrl = argv[++i];
    else if (a === '--username') out.username = argv[++i];
    else if (a === '--password') out.password = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function die(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function decodeEndpointsEnv() {
  const raw = process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS;
  if (!raw) die('Missing KIBANA_TESTING_INFERENCE_ENDPOINTS env var.');
  const parsed = safeJsonParse(Buffer.from(raw, 'base64').toString('utf8')) ?? safeJsonParse(raw);
  if (!parsed || typeof parsed !== 'object') {
    die('Failed to parse KIBANA_TESTING_INFERENCE_ENDPOINTS.');
  }
  return parsed;
}

function pickDefaultClaudeConnectorId(ids) {
  const preferred =
    ids.find((id) => /claude-opus/i.test(id)) ?? ids.find((id) => /claude/i.test(id));
  return preferred ?? ids[0];
}

function getBasicAuthHeader(username, password) {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${token}`;
}

async function httpJson(url, { method, headers, body }) {
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  return { res, text, json };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(
      [
        'repro_tool_choice_without_tools.js',
        '',
        'Required:',
        '  --kibana-url <url>         e.g. http://localhost:5620',
        'Optional:',
        '  --connector-id <id>        logical id from KIBANA_TESTING_INFERENCE_ENDPOINTS (defaults to a Claude id)',
        '  --username <u>             default: elastic',
        '  --password <p>             default: changeme',
        '',
      ].join('\n')
    );
    return;
  }

  const kibanaUrl = args.kibanaUrl;
  if (!kibanaUrl) die('Missing --kibana-url');

  const username = args.username ?? 'elastic';
  const password = args.password ?? 'changeme';

  const endpoints = decodeEndpointsEnv();
  const ids = Object.keys(endpoints);
  if (ids.length === 0) die('No endpoint definitions found in KIBANA_TESTING_INFERENCE_ENDPOINTS.');

  const logicalId = args.connectorId ?? pickDefaultClaudeConnectorId(ids);
  const def = endpoints[logicalId];
  if (!def) {
    die(`Connector id not found in KIBANA_TESTING_INFERENCE_ENDPOINTS: ${logicalId}`);
  }
  if (typeof def.inferenceId !== 'string' || !def.inferenceId) {
    die(`Definition ${logicalId} has no inferenceId; is this an inference endpoint definition?`);
  }

  const inferenceId = def.inferenceId;

  const commonHeaders = {
    Authorization: getBasicAuthHeader(username, password),
    'Content-Type': 'application/json',
    'kbn-xsrf': 'true',
    'x-elastic-internal-origin': 'Kibana',
    'elastic-api-version': INFERENCE_ENDPOINT_INTERNAL_API_VERSION,
  };

  const exists = await httpJson(
    `${kibanaUrl}/internal/_inference/_exists/${encodeURIComponent(inferenceId)}`,
    { method: 'GET', headers: commonHeaders }
  );
  if (!exists.res.ok) {
    die(`Failed to check inference endpoint (${exists.res.status}): ${exists.text.slice(0, 2000)}`);
  }

  if (exists.json?.isEndpointExists) {
    process.stdout.write(`Inference endpoint already exists: ${inferenceId}\n`);
  } else if (def.provider === 'elastic') {
    die(`EIS endpoint ${inferenceId} is not provisioned; run with EIS/CCM enabled.`);
  } else {
    // Create the endpoint (do not log secrets)
    const create = await httpJson(`${kibanaUrl}/internal/_inference/_add`, {
      method: 'POST',
      headers: commonHeaders,
      body: {
        config: {
          inferenceId,
          provider: def.provider,
          taskType: def.taskType,
          providerConfig: def.providerConfig ?? {},
          ...(def.taskTypeConfig ? { taskTypeConfig: def.taskTypeConfig } : {}),
          ...(def.headers ? { headers: def.headers } : {}),
        },
        secrets: { providerSecrets: def.secrets?.providerSecrets ?? {} },
      },
    });
    if (!create.res.ok) {
      die(
        `Failed to create inference endpoint (${create.res.status}): ${create.text.slice(0, 2000)}`
      );
    }
    process.stdout.write(`Created inference endpoint: ${inferenceId}\n`);
  }

  // Trigger inference: toolChoice without tools. The inference plugin resolves endpoint ids as connector ids.
  const invoke = await httpJson(`${kibanaUrl}/internal/inference/chat_complete`, {
    method: 'POST',
    headers: commonHeaders,
    body: {
      connectorId: inferenceId,
      toolChoice: 'auto',
      messages: [{ role: 'user', content: 'Say hello.' }],
    },
  });

  process.stdout.write(`Connector: ${logicalId} (${inferenceId})\n`);
  process.stdout.write(`Status: ${invoke.res.status}\n`);
  if (invoke.res.ok) {
    process.stdout.write(`Response (ok): ${invoke.text.slice(0, 2000)}\n`);
  } else {
    process.stdout.write(`Response (error): ${invoke.text.slice(0, 4000)}\n`);
  }
}

main().catch((e) => {
  process.stderr.write(`Unexpected error: ${e?.stack || String(e)}\n`);
  process.exit(1);
});
