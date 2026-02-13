/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validate a kbn-evals CI config payload (JSON) against the permissive schema.
 *
 * - Allows unknown keys (so adding new fields won't break existing consumers).
 * - Prints nothing on success.
 * - Prints a safe error message on failure (without dumping config contents).
 *
 * NOTE: This script is executed from CI "repository hooks" before dependencies are installed,
 * so it MUST NOT require repo packages (e.g. @kbn/babel-register).
 */

const Fs = require('fs');

function die(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function usage() {
  return [
    'Usage: node validate_config.js [--config <path>] [--stdin]',
    '',
    'Options:',
    '  --config, -c   Path to JSON config file',
    '  --stdin        Read JSON from stdin instead of a file',
    '  --help, -h     Show this help',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    config: 'x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json',
    stdin: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }

    if (arg === '--stdin') {
      parsed.stdin = true;
      continue;
    }

    if (arg === '--config' || arg === '-c') {
      const value = argv[i + 1];
      if (!value) {
        die('Missing value for --config');
      }
      parsed.config = value;
      i++;
      continue;
    }

    if (arg.startsWith('--config=')) {
      const value = arg.slice('--config='.length);
      if (!value) {
        die('Missing value for --config');
      }
      parsed.config = value;
      continue;
    }

    die(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function redact(message) {
  if (!message) return message;
  return (
    String(message)
      // LiteLLM virtual keys
      .replace(/sk-[A-Za-z0-9_-]+/g, '<redacted>')
      // base64 blobs (avoid leaking via error messages)
      .replace(/[A-Za-z0-9+/]{50,}={0,2}/g, '<redacted>')
  );
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function assertNonEmptyString(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const part of parts) {
    if (!cur || typeof cur !== 'object' || !(part in cur)) {
      die(`Invalid kbn-evals CI config: missing "${path}"`);
    }
    cur = cur[part];
  }
  if (!isNonEmptyString(cur)) {
    die(`Invalid kbn-evals CI config: "${path}" must be a non-empty string`);
  }
}

function assertOptionalNonEmptyString(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!cur || typeof cur !== 'object' || !(part in cur)) {
      return; // missing is ok
    }
    cur = cur[part];
  }
  if (cur === undefined || cur === null) return;
  if (!isNonEmptyString(cur)) {
    die(`Invalid kbn-evals CI config: "${path}" must be a non-empty string when provided`);
  }
}

function validateConfigShape(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    die('Invalid kbn-evals CI config: root must be a JSON object');
  }

  // Required
  assertNonEmptyString(config, 'litellm.baseUrl');
  assertNonEmptyString(config, 'litellm.virtualKey');
  assertNonEmptyString(config, 'evaluationConnectorId');
  assertNonEmptyString(config, 'evaluationsEs.url');
  assertNonEmptyString(config, 'evaluationsEs.apiKey');

  // Optional
  assertOptionalNonEmptyString(config, 'litellm.teamId');
  assertOptionalNonEmptyString(config, 'litellm.teamName');

  // Optional tracingEs block (if present, require both fields)
  const tracingEs = config.tracingEs;
  if (tracingEs !== undefined && tracingEs !== null) {
    if (!tracingEs || typeof tracingEs !== 'object' || Array.isArray(tracingEs)) {
      die('Invalid kbn-evals CI config: "tracingEs" must be an object when provided');
    }
    assertNonEmptyString(config, 'tracingEs.url');
    assertNonEmptyString(config, 'tracingEs.apiKey');
  }

  // Optional tracingExporters array (supports http, grpc, phoenix, langfuse exporters)
  const tracingExporters = config.tracingExporters;
  if (tracingExporters !== undefined && tracingExporters !== null) {
    if (!Array.isArray(tracingExporters) || tracingExporters.length === 0) {
      die(
        'Invalid kbn-evals CI config: "tracingExporters" must be a non-empty array when provided'
      );
    }
    const allowedKeys = new Set(['http', 'grpc', 'phoenix', 'langfuse']);
    for (let i = 0; i < tracingExporters.length; i++) {
      const entry = tracingExporters[i];
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        die(`Invalid kbn-evals CI config: "tracingExporters[${i}]" must be an object`);
      }
      const keys = Object.keys(entry);
      if (keys.length !== 1) {
        die(
          `Invalid kbn-evals CI config: "tracingExporters[${i}]" must have exactly one key (one of: ${[
            ...allowedKeys,
          ].join(', ')})`
        );
      }
      if (!allowedKeys.has(keys[0])) {
        die(
          `Invalid kbn-evals CI config: "tracingExporters[${i}]" has unknown key "${
            keys[0]
          }" (allowed: ${[...allowedKeys].join(', ')})`
        );
      }
    }
  }
}

async function readStdin() {
  return await new Promise((resolve) => {
    let s = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (d) => (s += d));
    process.stdin.on('end', () => resolve(s));
  });
}

async function main() {
  const argv = parseArgs(process.argv.slice(2));

  const useStdin = Boolean(argv.stdin);
  const configPath = String(argv.config);

  let raw;
  if (useStdin) {
    raw = await readStdin();
  } else {
    if (!Fs.existsSync(configPath)) {
      die(`Missing config file: ${configPath}`);
    }
    raw = Fs.readFileSync(configPath, 'utf8');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    die(`Invalid JSON${useStdin ? '' : ` in ${configPath}`}: ${redact(e.message)}`);
  }

  try {
    validateConfigShape(parsed);
  } catch (e) {
    die(`Invalid kbn-evals CI config${useStdin ? '' : ` in ${configPath}`}: ${redact(e.message)}`);
  }
}

main().catch((e) => die(redact(e && e.message ? e.message : String(e))));
