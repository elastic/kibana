#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generate `KIBANA_TESTING_AI_CONNECTORS` payload for @kbn/evals from LiteLLM.
 *
 * This script:
 * - resolves team id from team name (via /team/list or /team/available) unless --team-id is provided
 * - fetches team info (via /team/info?team_id=...) to discover accessible models
 * - emits base64 JSON payload matching the expected connectors schema
 *
 * Auth: LiteLLM *virtual key* (sk-...) via Authorization Bearer.
 */

function parseArgs(argv, { defaults = {} } = {}) {
  const out = { ...defaults };
  const rest = [];

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--') {
      rest.push(...argv.slice(i + 1));
      break;
    }

    if (!token.startsWith('--')) {
      rest.push(token);
      continue;
    }

    const eqIdx = token.indexOf('=');
    if (eqIdx !== -1) {
      const key = token.slice(2, eqIdx);
      const value = token.slice(eqIdx + 1);
      out[key] = value;
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (next == null || next.startsWith('--')) {
      out[key] = 'true';
      continue;
    }

    out[key] = next;
    i++;
  }

  out._ = rest;
  return out;
}

function die(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function getArg(argv, name, envName) {
  return argv[name] || (envName ? process.env[envName] : undefined);
}

function sanitizeId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function unwrapCandidates(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  return (
    payload.teams ||
    payload.data ||
    payload.items ||
    payload.results ||
    payload.available_teams ||
    []
  );
}

function normalizeTeamName(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function findTeamIdByName(teams, teamName) {
  const target = normalizeTeamName(teamName);
  for (const t of teams) {
    if (!t || typeof t !== 'object') continue;
    const aliasRaw = (t.team_alias ?? t.team_name ?? t.name ?? t.alias ?? '').toString();
    const alias = normalizeTeamName(aliasRaw);
    if (alias && alias === target) {
      return t.team_id ?? t.id ?? t.teamId;
    }
  }
  return undefined;
}

function extractModelNames(teamInfo) {
  if (!teamInfo || typeof teamInfo !== 'object') return [];

  const nested = teamInfo.team_info || teamInfo.teamInfo || teamInfo.team;

  const candidates =
    teamInfo.models ||
    teamInfo.model_list ||
    teamInfo.allowed_models ||
    (teamInfo.data &&
      (teamInfo.data.models || teamInfo.data.model_list || teamInfo.data.allowed_models)) ||
    (nested && (nested.models || nested.model_list || nested.allowed_models)) ||
    [];

  if (!Array.isArray(candidates)) return [];
  return candidates
    .map((m) => {
      if (typeof m === 'string') return m;
      if (m && typeof m === 'object') {
        return m.model_name ?? m.model ?? m.name ?? m.id;
      }
      return undefined;
    })
    .filter(Boolean);
}

async function httpJson(url, apiKey) {
  if (typeof fetch !== 'function') {
    die('Global fetch is not available in this Node runtime.');
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  if (!res.ok) {
    die(`LiteLLM request failed: ${res.status} ${res.statusText}\n${text}`);
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    die(`Failed to parse LiteLLM JSON response from ${url}\n${text}`);
  }
}

async function httpJsonMaybe(url, apiKey, { allowStatuses = [404, 405] } = {}) {
  if (typeof fetch !== 'function') {
    die('Global fetch is not available in this Node runtime.');
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  if (!res.ok) {
    if (allowStatuses.includes(res.status)) {
      return null;
    }
    die(`LiteLLM request failed: ${res.status} ${res.statusText}\n${text}`);
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    die(`Failed to parse LiteLLM JSON response from ${url}\n${text}`);
  }
}

async function fetchTeams(baseUrl, apiKey) {
  // LiteLLM deployments vary; prefer /team/list if present, fall back to /team/available.
  const list = await httpJsonMaybe(`${baseUrl}/team/list`, apiKey);
  if (list) {
    return unwrapCandidates(list);
  }

  const available = await httpJsonMaybe(`${baseUrl}/team/available`, apiKey, {
    allowStatuses: [404],
  });
  if (available) {
    return unwrapCandidates(available);
  }

  die(
    'Unable to list teams from LiteLLM. Tried /team/list and /team/available but neither endpoint is available.'
  );
}

async function main() {
  const argv = parseArgs(process.argv.slice(2), {
    defaults: {
      'base-url': 'https://elastic.litellm-prod.ai',
      'team-name': 'kibana-ci-evals',
      'model-prefix': 'llm-gateway/',
      format: 'base64',
    },
  });

  const baseUrl = String(getArg(argv, 'base-url')).replace(/\/+$/, '');
  const apiKey =
    getArg(argv, 'api-key', 'LITELLM_VIRTUAL_KEY') || getArg(argv, 'api-key', 'LITELLM_API_KEY');
  if (!apiKey) {
    die('Missing --api-key (or set LITELLM_VIRTUAL_KEY).');
  }

  const teamIdArg = getArg(argv, 'team-id');
  const teamName = getArg(argv, 'team-name');
  const modelPrefix = String(getArg(argv, 'model-prefix')).trim();

  let teamId = teamIdArg;
  if (!teamId) {
    const teams = await fetchTeams(baseUrl, apiKey);
    const resolved = findTeamIdByName(teams, teamName);
    if (!resolved) {
      const known = teams
        .map((t) =>
          t && typeof t === 'object' ? t.team_alias ?? t.team_name ?? t.name : undefined
        )
        .filter(Boolean)
        .slice(0, 50);
      die(
        `Unable to resolve team id for team name "${teamName}".\n` +
          `Known team names (first 50): ${known.join(', ') || '(none)'}.`
      );
    }
    teamId = resolved;
  }

  const teamInfo = await httpJson(
    `${baseUrl}/team/info?team_id=${encodeURIComponent(String(teamId))}`,
    apiKey
  );
  const modelNames = extractModelNames(teamInfo);
  if (modelNames.length === 0) {
    die(`No models found for team_id=${teamId}. Unable to generate connectors.`);
  }

  const chatUrl = `${baseUrl}/v1/chat/completions`;
  const connectors = {};

  for (const rawModelName of modelNames) {
    const modelName = String(rawModelName);
    const fullModel = modelName.startsWith(modelPrefix) ? modelName : `${modelPrefix}${modelName}`;
    const connectorId = `litellm-${sanitizeId(fullModel)}`;

    connectors[connectorId] = {
      name: `LiteLLM ${fullModel}`,
      actionTypeId: '.gen-ai',
      config: {
        apiProvider: 'Other',
        apiUrl: chatUrl,
        defaultModel: fullModel,
      },
      secrets: {
        apiKey,
      },
    };
  }

  const format = String(argv.format || 'base64').toLowerCase();
  const json = JSON.stringify(connectors);
  if (format === 'json') {
    process.stdout.write(`${json}\n`);
    return;
  }

  if (format !== 'base64' && format !== 'b64') {
    die(`Unknown --format "${argv.format}". Use "base64" or "json".`);
  }

  const asB64 = Buffer.from(json, 'utf-8').toString('base64');
  process.stdout.write(`${asB64}\n`);
}

main().catch((e) => {
  die(e && e.stack ? e.stack : String(e));
});
