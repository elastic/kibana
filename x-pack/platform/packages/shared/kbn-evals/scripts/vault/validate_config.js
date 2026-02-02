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
 */

require('@kbn/babel-register').install();

const Fs = require('fs');
const minimist = require('minimist');
const { validateKbnEvalsCiConfig } = require('./manage_secrets');

function die(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
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

async function readStdin() {
  return await new Promise((resolve) => {
    let s = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (d) => (s += d));
    process.stdin.on('end', () => resolve(s));
  });
}

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ['config'],
    boolean: ['stdin'],
    default: {
      config: 'x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json',
      stdin: false,
    },
  });

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
    validateKbnEvalsCiConfig(parsed);
  } catch (e) {
    die(`Invalid kbn-evals CI config${useStdin ? '' : ` in ${configPath}`}: ${redact(e.message)}`);
  }
}

main().catch((e) => die(redact(e && e.message ? e.message : String(e))));
