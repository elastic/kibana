/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { execFileSync } from 'child_process';
import type { Command } from '@kbn/dev-cli-runner';

const SCOUT_LOCAL_SERVER_CONFIG_PATH = '.scout/servers/local.json';

export const doctorCmd: Command<void> = {
  name: 'doctor',
  description: `
  Check common prerequisites for running evals locally.

  Example:
    node scripts/evals doctor
  `,
  run: ({ log }) => {
    const issues: string[] = [];
    const warnings: string[] = [];
    const runtimeChecks: Array<{ label: string; status: string }> = [];

    const safeExec = (command: string, args: string[]) => {
      try {
        return execFileSync(command, args, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        })
          .toString()
          .trim();
      } catch (error) {
        return null;
      }
    };

    if (!process.env.EVALUATION_CONNECTOR_ID) {
      issues.push(
        'EVALUATION_CONNECTOR_ID is required for LLM-as-a-judge evaluators. Set it via --evaluation-connector-id or env.'
      );
    }

    if (process.env.KBN_EVALS_EXECUTOR === 'phoenix') {
      if (!process.env.PHOENIX_BASE_URL) {
        issues.push('PHOENIX_BASE_URL is required when KBN_EVALS_EXECUTOR=phoenix.');
      }
      if (!process.env.PHOENIX_API_KEY) {
        warnings.push('PHOENIX_API_KEY is missing (required for authenticated Phoenix instances).');
      }
    }

    if (!process.env.TRACING_ES_URL) {
      warnings.push(
        'TRACING_ES_URL not set. Trace-based evaluators will use the Scout test cluster (esClient).'
      );
    }

    const dockerPs = safeExec('docker', [
      'ps',
      '--filter',
      'name=kibana-edot-collector',
      '--format',
      '{{.Names}}',
    ]);
    if (dockerPs === null) {
      runtimeChecks.push({ label: 'EDOT collector', status: 'unknown (docker not available)' });
    } else if (dockerPs.length > 0) {
      runtimeChecks.push({ label: 'EDOT collector', status: 'running' });
    } else {
      runtimeChecks.push({ label: 'EDOT collector', status: 'not running' });
    }

    const scoutProcesses = safeExec('pgrep', ['-af', 'scripts/scout.js start-server']);
    const scoutIsRunning = scoutProcesses !== null && scoutProcesses.length > 0;

    if (scoutProcesses === null) {
      runtimeChecks.push({ label: 'Scout server', status: 'unknown (pgrep not available)' });
    } else if (scoutIsRunning) {
      const serverConfigSetMatch = scoutProcesses.match(/--serverConfigSet(?:=|\s+)(\S+)/);
      const configDir = serverConfigSetMatch?.[1];
      const targetArch = /--arch(?:=|\s+)stateful/.test(scoutProcesses)
        ? 'stateful'
        : /--arch(?:=|\s+)serverless/.test(scoutProcesses)
        ? 'serverless'
        : undefined;

      const details = [targetArch, configDir ? `serverConfigSet=${configDir}` : undefined]
        .filter(Boolean)
        .join(', ');

      runtimeChecks.push({
        label: 'Scout server',
        status: details.length ? `running (${details})` : 'running',
      });
    } else {
      runtimeChecks.push({ label: 'Scout server', status: 'not running' });
    }

    // Only relevant when you're targeting your own Kibana (not starting via Scout).
    // If Scout is running, it already owns its own runtime config.
    const scoutConfigExists = Fs.existsSync(
      Path.join(process.cwd(), SCOUT_LOCAL_SERVER_CONFIG_PATH)
    );
    if (!scoutIsRunning && !scoutConfigExists) {
      warnings.push(
        `No ${SCOUT_LOCAL_SERVER_CONFIG_PATH} found. If you want to target a local Kibana instance (instead of starting one via Scout), create it.`
      );
    }

    if (issues.length === 0) {
      log.info('Doctor check passed.');
    } else {
      log.error('Doctor check found blocking issues:');
      issues.forEach((issue) => log.error(`- ${issue}`));
    }

    if (warnings.length > 0) {
      log.warning('Additional recommendations:');
      warnings.forEach((warning) => log.warning(`- ${warning}`));
    }

    if (runtimeChecks.length > 0) {
      log.info('Runtime checks:');
      runtimeChecks.forEach((check) => log.info(`- ${check.label}: ${check.status}`));
    }

    log.info('Common local flow:');
    log.info('  1) Start Scout with tracing enabled (recommended):');
    log.info(
      '     node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_tracing'
    );
    log.info('     # This enables OTLP export to http://localhost:4318/v1/traces');
    log.info('  2) Run EDOT collector to capture traces (uses kibana.dev.yml by default):');
    log.info('     node scripts/edot_collector.js');
    log.info('     # Optional: override ES target for traces');
    log.info('     # ELASTICSEARCH_HOST=http://localhost:9220 node scripts/edot_collector.js');
    log.info('  3) Run evals (repeat step 3 for another suite in a new terminal if desired):');
    log.info(
      '     node scripts/evals run --suite <suite-id> --evaluation-connector-id <connector-id>'
    );
  },
};
