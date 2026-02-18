#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Local repro: trigger the LiteLLM/Anthropic error when `tool_choice` is sent without `tools`.
 *
 * Usage (after starting Kibana + setting KIBANA_TESTING_AI_CONNECTORS):
 *   node x-pack/platform/packages/shared/kbn-evals/scripts/local_repros/repro_tool_choice_without_tools.js \
 *     --connector-id litellm-llm-gateway-claude-opus-4-5 \
 *     --kibana-url http://localhost:5620
 *
 * Notes:
 * - This script creates a connector in Kibana using the definition from KIBANA_TESTING_AI_CONNECTORS,
 *   calls /internal/inference/chat_complete with toolChoice:"auto" and no tools, then deletes the connector.
 * - Do NOT print connector secrets.
 */

const { v5: uuidv5 } = require('uuid');

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

function decodeConnectorsEnv() {
  const b64 = process.env.KIBANA_TESTING_AI_CONNECTORS;
  if (!b64) die('Missing KIBANA_TESTING_AI_CONNECTORS env var.');
  const json = Buffer.from(b64, 'base64').toString('utf8');
  const parsed = safeJsonParse(json);
  if (!parsed || typeof parsed !== 'object') die('Failed to parse KIBANA_TESTING_AI_CONNECTORS.');
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
        '  --connector-id <id>        logical id from KIBANA_TESTING_AI_CONNECTORS (defaults to a Claude id)',
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

  const connectors = decodeConnectorsEnv();
  const ids = Object.keys(connectors);
  if (ids.length === 0) die('No connectors found in KIBANA_TESTING_AI_CONNECTORS.');

  const logicalId = args.connectorId ?? pickDefaultClaudeConnectorId(ids);
  const def = connectors[logicalId];
  if (!def) {
    die(`Connector id not found in KIBANA_TESTING_AI_CONNECTORS: ${logicalId}`);
  }

  const connectorUuid = uuidv5(logicalId, uuidv5.DNS);

  const commonHeaders = {
    Authorization: getBasicAuthHeader(username, password),
    'Content-Type': 'application/json',
    'kbn-xsrf': 'true',
    'x-elastic-internal-origin': 'Kibana',
  };

  // Best-effort cleanup
  await fetch(`${kibanaUrl}/api/actions/connector/${connectorUuid}`, {
    method: 'DELETE',
    headers: commonHeaders,
  }).catch(() => {});

  // Create connector (do not log secrets)
  const create = await httpJson(`${kibanaUrl}/api/actions/connector/${connectorUuid}`, {
    method: 'POST',
    headers: commonHeaders,
    body: {
      config: def.config,
      connector_type_id: def.actionTypeId,
      name: def.name,
      secrets: def.secrets,
    },
  });
  if (!create.res.ok) {
    die(`Failed to create connector (${create.res.status}): ${create.text.slice(0, 2000)}`);
  }

  // Trigger inference: toolChoice without tools.
  const invoke = await httpJson(`${kibanaUrl}/internal/inference/chat_complete`, {
    method: 'POST',
    headers: commonHeaders,
    body: {
      connectorId: connectorUuid,
      toolChoice: 'auto',
      messages: [{ role: 'user', content: 'Say hello.' }],
    },
  });

  process.stdout.write(`Connector: ${logicalId} (${connectorUuid})\n`);
  process.stdout.write(`Status: ${invoke.res.status}\n`);
  if (invoke.res.ok) {
    process.stdout.write(`Response (ok): ${invoke.text.slice(0, 2000)}\n`);
  } else {
    process.stdout.write(`Response (error): ${invoke.text.slice(0, 4000)}\n`);
  }

  // Teardown
  await fetch(`${kibanaUrl}/api/actions/connector/${connectorUuid}`, {
    method: 'DELETE',
    headers: commonHeaders,
  }).catch(() => {});
}

main().catch((e) => {
  process.stderr.write(`Unexpected error: ${e?.stack || String(e)}\n`);
  process.exit(1);
});
