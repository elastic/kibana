/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yargs from 'yargs';

export interface BenchmarkConfig {
  mode: 'snapshot' | 'watch' | 'prepare' | 'upgrade';
  label: string;
  kibana: string;
  elasticsearch: string;
  username: string;
  password: string;
  esUsername: string;
  esPassword: string;
  out: string;
  forceMerge: boolean;
  reads: boolean;
  verifyCases: number;
  readSamples: number;
  owner: string;
  probeSeconds: number;
  probeIntervalMs: number;
  intervalSeconds: number;
  maxMinutes: number;
  kibanaLog: string[];
  targetVersion: string;
  zdt: boolean;
  metadataWrites: number;
  metadataWritesDuring: number;
  expectAttachments?: number;
}

export const parseConfig = (): BenchmarkConfig =>
  yargs.help().options({
    mode: {
      choices: ['snapshot', 'watch', 'prepare', 'upgrade'] as const,
      demandOption: true,
      describe:
        'snapshot: storage, counts and optionally correctness and reads at one point. ' +
        'watch: follow the migration from Kibana start to completion. ' +
        'prepare: create the probe rule a later upgrade run uses, and record the dataset. ' +
        'upgrade: follow a saved-object model version upgrade from before Kibana starts',
    },
    label: { type: 'string', demandOption: true, describe: 'Name of the report files' },
    kibana: { type: 'string', default: 'http://localhost:5601' },
    elasticsearch: { type: 'string', default: 'http://localhost:9200' },
    username: { type: 'string', default: 'elastic' },
    password: { type: 'string', default: 'changeme' },
    esUsername: {
      type: 'string',
      default: 'system_indices_superuser',
      describe: 'Elasticsearch user that may force merge and read the system indices',
    },
    esPassword: { type: 'string', default: 'changeme' },
    out: {
      type: 'string',
      default: 'observables_migration_benchmark',
      describe: 'Report directory',
    },
    forceMerge: {
      type: 'boolean',
      default: false,
      describe: 'Merge the index to one segment before measuring storage',
    },
    reads: { type: 'boolean', default: false, describe: 'Measure Kibana read latency (snapshot)' },
    verifyCases: {
      type: 'number',
      default: 1_000,
      describe: 'Cases sampled to check their observables were migrated (snapshot)',
    },
    readSamples: { type: 'number', default: 20, describe: 'Timed runs per read' },
    owner: { type: 'string', default: 'securitySolution' },
    probeSeconds: { type: 'number', default: 30, describe: 'Rule write probe duration (snapshot)' },
    probeIntervalMs: { type: 'number', default: 100, describe: 'Pause between rule writes' },
    intervalSeconds: { type: 'number', default: 10, describe: 'Sampling interval (watch)' },
    maxMinutes: {
      type: 'number',
      default: 600,
      describe: 'Give up watching after (watch, upgrade)',
    },
    kibanaLog: {
      type: 'array',
      string: true,
      default: [] as string[],
      describe: 'Kibana log files to parse for the migration steps (upgrade); repeat per node',
    },
    targetVersion: {
      type: 'string',
      default: '10.3.0',
      describe: 'cases-attachments version the upgrade migrates to (upgrade, snapshot)',
    },
    zdt: {
      type: 'boolean',
      default: false,
      describe: 'The upgrade uses the zdt algorithm: Kibana serves traffic while docs migrate',
    },
    metadataWrites: {
      type: 'number',
      default: 0,
      describe: 'Observables whose metadata is set, read back and cleared (snapshot)',
    },
    metadataWritesDuring: {
      type: 'number',
      default: 0,
      describe:
        'Outdated observables whose metadata is set while the docs migrate, checked after (upgrade --zdt)',
    },
    expectAttachments: {
      type: 'number',
      describe: 'Check every cases-attachments doc is at --targetVersion and the count (snapshot)',
    },
  }).argv as BenchmarkConfig;
