/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'child_process';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import type { Command } from '@kbn/dev-cli-runner';
import {
  buildEntrySourceDisplayName,
  buildFullyQualifiedName,
  formatShellCommand,
  readAspectData,
  listYamlFilesRecursively,
} from './dataplex_utils';

const DEFAULT_PROJECT = 'elastic-observability';
const DEFAULT_LOCATION = 'us-central1';
const DEFAULT_ENTRY_GROUP = 'snapshot-datasets';
const DEFAULT_ASPECT_TYPE_ID = 'es-snapshot-dataset';
const DEFAULT_ENTRY_TYPE_ID = 'es-snapshot';

const ASPECTS_ROOT = Path.join(
  'x-pack',
  'platform',
  'packages',
  'shared',
  'kbn-evals',
  'snapshots',
  'dataplex'
);

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

const runGcloud = (args: string[], options?: { cwd?: string }): RunResult => {
  const res = spawnSync('gcloud', args, {
    cwd: options?.cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
};

const ensureGcloud = (): void => {
  const res = runGcloud(['--version']);
  if (res.status !== 0) {
    throw new Error(
      'gcloud is required. Install and authenticate with Google Cloud SDK, then retry.'
    );
  }
};

const isPermissionDenied = (stderrOrStdout: string): boolean =>
  (stderrOrStdout.includes('Permission') && stderrOrStdout.includes('denied')) ||
  stderrOrStdout.includes('PERMISSION_DENIED') ||
  stderrOrStdout.includes('dataplex.entries.create') ||
  stderrOrStdout.includes('dataplex.entries.update') ||
  stderrOrStdout.includes('dataplex.entries.lookup') ||
  stderrOrStdout.includes('Status code: 403');

const entryTypeResource = (project: string) =>
  `projects/${project}/locations/global/entryTypes/${DEFAULT_ENTRY_TYPE_ID}`;

const entryResourceName = (
  project: string,
  location: string,
  entryGroup: string,
  entryId: string
) => `projects/${project}/locations/${location}/entryGroups/${entryGroup}/entries/${entryId}`;

const lookupEntry = (
  project: string,
  location: string,
  entryGroup: string,
  entryId: string
): boolean => {
  const res = runGcloud([
    'dataplex',
    'entries',
    'lookup',
    '--project',
    project,
    '--location',
    location,
    '--entry',
    entryResourceName(project, location, entryGroup, entryId),
    '--view',
    'BASIC',
  ]);
  return res.status === 0;
};

const syncEntry = ({
  project,
  location,
  entryGroup,
  entryId,
  aspectsFile,
  gcsPath,
  description,
  dryRun,
  printCommands,
  log,
}: {
  project: string;
  location: string;
  entryGroup: string;
  entryId: string;
  aspectsFile: string;
  gcsPath: string;
  description: string | undefined;
  dryRun: boolean;
  printCommands: boolean;
  log: { info: (m: string) => void };
}): { action: 'created' | 'updated' | 'skipped' | 'printed' } => {
  const fqn = buildFullyQualifiedName(gcsPath);
  const displayName = buildEntrySourceDisplayName(gcsPath);
  const updateTime = new Date().toISOString();

  if (printCommands) {
    const createArgs = [
      'gcloud',
      'dataplex',
      'entries',
      'create',
      entryId,
      '--project',
      project,
      '--location',
      location,
      '--entry-group',
      entryGroup,
      '--entry-type',
      entryTypeResource(project),
      '--fully-qualified-name',
      fqn,
      '--entry-source-resource',
      gcsPath,
      '--entry-source-display-name',
      displayName,
      '--entry-source-description',
      description ?? displayName,
      '--entry-source-update-time',
      updateTime,
      '--aspects',
      aspectsFile,
    ];
    const updateArgs = [
      'gcloud',
      'dataplex',
      'entries',
      'update',
      entryId,
      '--project',
      project,
      '--location',
      location,
      '--entry-group',
      entryGroup,
      '--fully-qualified-name',
      fqn,
      '--entry-source-resource',
      gcsPath,
      '--entry-source-display-name',
      displayName,
      '--entry-source-description',
      description ?? displayName,
      '--entry-source-update-time',
      updateTime,
      '--update-aspects',
      aspectsFile,
    ];

    log.info(`# ${entryId}`);
    log.info(`${formatShellCommand(createArgs)} || ${formatShellCommand(updateArgs)}`);
    return { action: 'printed' };
  }

  if (dryRun) {
    log.info(`SYNC ${entryId} (gcs_path=${gcsPath})`);
    return { action: 'skipped' };
  }

  const exists = lookupEntry(project, location, entryGroup, entryId);

  if (!exists) {
    const res = runGcloud([
      'dataplex',
      'entries',
      'create',
      entryId,
      '--project',
      project,
      '--location',
      location,
      '--entry-group',
      entryGroup,
      '--entry-type',
      entryTypeResource(project),
      '--fully-qualified-name',
      fqn,
      '--entry-source-resource',
      gcsPath,
      '--entry-source-display-name',
      displayName,
      '--entry-source-description',
      description ?? displayName,
      '--entry-source-update-time',
      updateTime,
      '--aspects',
      aspectsFile,
    ]);
    if (res.status !== 0) {
      const msg = res.stderr || res.stdout;
      if (isPermissionDenied(msg)) {
        throw new Error(
          `Permission denied creating Dataplex entry "${entryId}". ` +
            `Ask for Dataplex entry permissions (e.g. roles/dataplex.entryOwner or roles/dataplex.catalogEditor) ` +
            `on project "${project}" entry group "${entryGroup}" in location "${location}".\n\n` +
            `To generate a command for someone else to run, use:\n` +
            `  node scripts/evals dataplex sync --print-commands`
        );
      }
      throw new Error(`Failed to create entry ${entryId}: ${msg}`);
    }
    return { action: 'created' };
  }

  const res = runGcloud([
    'dataplex',
    'entries',
    'update',
    entryId,
    '--project',
    project,
    '--location',
    location,
    '--entry-group',
    entryGroup,
    '--fully-qualified-name',
    fqn,
    '--entry-source-resource',
    gcsPath,
    '--entry-source-display-name',
    displayName,
    '--entry-source-description',
    description ?? displayName,
    '--entry-source-update-time',
    updateTime,
    '--update-aspects',
    aspectsFile,
  ]);
  if (res.status !== 0) {
    const msg = res.stderr || res.stdout;
    if (isPermissionDenied(msg)) {
      throw new Error(
        `Permission denied updating Dataplex entry "${entryId}". ` +
          `Ask for Dataplex entry permissions (e.g. roles/dataplex.entryOwner or roles/dataplex.catalogEditor) ` +
          `on project "${project}" entry group "${entryGroup}" in location "${location}".\n\n` +
          `To generate a command for someone else to run, use:\n` +
          `  node scripts/evals dataplex sync --print-commands`
      );
    }
    throw new Error(`Failed to update entry ${entryId}: ${msg}`);
  }
  return { action: 'updated' };
};

const buildAspectTemplateJson = (): string =>
  JSON.stringify(
    {
      name: 'es_snapshot_metadata',
      type: 'record',
      recordFields: [
        {
          name: 'gcs_path',
          type: 'string',
          index: 1,
          annotations: { description: 'Full GCS path (e.g. gs://bucket/path/to/snapshot)' },
          constraints: { required: true },
        },
        {
          name: 'description',
          type: 'string',
          index: 2,
          annotations: { description: 'What this snapshot dataset represents' },
          constraints: { required: true },
        },
        {
          name: 'es_version',
          type: 'string',
          index: 3,
          annotations: { description: 'Elasticsearch version used to create the snapshot' },
        },
        {
          name: 'indices',
          type: 'string',
          index: 4,
          annotations: {
            description:
              'Comma-separated index/data stream patterns (e.g. logs-*,metrics-*,traces-*)',
          },
        },
        {
          name: 'timestamp_range',
          type: 'string',
          index: 5,
          annotations: { description: 'Rough timestamp range, e.g. 2026-01-15 to 2026-01-20' },
        },
        {
          name: 'source',
          type: 'string',
          index: 6,
          annotations: { description: 'Data source (e.g. OTel Demo, synthetic, production-like)' },
        },
        {
          name: 'team',
          type: 'string',
          index: 7,
          annotations: { description: 'Owning team (e.g. obs-ai, security-ai)' },
          constraints: { required: true },
        },
        {
          name: 'deprecated',
          type: 'string',
          index: 8,
          annotations: {
            description: "Set to 'true' with reason if deprecated, leave empty otherwise",
          },
        },
      ],
    },
    null,
    2
  );

const maybeBootstrap = (
  project: string,
  log: { info: (m: string) => void; warning: (m: string) => void }
) => {
  const locationGlobal = 'global';

  const aspectDescribe = runGcloud([
    'dataplex',
    'aspect-types',
    'describe',
    DEFAULT_ASPECT_TYPE_ID,
    '--project',
    project,
    '--location',
    locationGlobal,
  ]);
  if (aspectDescribe.status === 0) {
    log.info('Dataplex aspect type already exists.');
    return;
  }

  log.info('Bootstrapping Dataplex schema (aspect type + entry type + entry group)...');
  const tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-evals-dataplex-'));
  const templatePath = Path.join(tmpDir, 'aspect_template.json');
  Fs.writeFileSync(templatePath, buildAspectTemplateJson(), 'utf8');

  const createAspect = runGcloud([
    'dataplex',
    'aspect-types',
    'create',
    DEFAULT_ASPECT_TYPE_ID,
    '--location',
    locationGlobal,
    '--project',
    project,
    '--display-name',
    'ES Snapshot Dataset',
    '--description',
    'Metadata schema for Elasticsearch snapshot datasets',
    '--metadata-template-file-name',
    templatePath,
  ]);
  if (createAspect.status !== 0) {
    throw new Error(`Failed to create aspect type: ${createAspect.stderr || createAspect.stdout}`);
  }

  const createEntryType = runGcloud([
    'dataplex',
    'entry-types',
    'create',
    DEFAULT_ENTRY_TYPE_ID,
    '--location',
    locationGlobal,
    '--project',
    project,
    '--display-name',
    'ES Snapshot',
    '--description',
    'An Elasticsearch snapshot dataset stored in GCS',
    '--required-aspects',
    `type="projects/${project}/locations/${locationGlobal}/aspectTypes/${DEFAULT_ASPECT_TYPE_ID}"`,
  ]);
  if (createEntryType.status !== 0) {
    throw new Error(
      `Failed to create entry type: ${createEntryType.stderr || createEntryType.stdout}`
    );
  }

  const createEntryGroup = runGcloud([
    'dataplex',
    'entry-groups',
    'create',
    DEFAULT_ENTRY_GROUP,
    '--location',
    DEFAULT_LOCATION,
    '--project',
    project,
    '--display-name',
    'Snapshot Datasets',
    '--description',
    'Elasticsearch snapshot datasets for AI evaluations',
  ]);

  if (createEntryGroup.status !== 0) {
    // This often fails with already-exists if someone created it manually. Treat as warning.
    log.warning(
      `Entry group create returned non-zero: ${createEntryGroup.stderr || createEntryGroup.stdout}`
    );
  }
};

export const dataplexCmd: Command<void> = {
  name: 'dataplex',
  description: `
  Manage Dataplex catalog entries for snapshot datasets.

  Subcommands:
    node scripts/evals dataplex bootstrap          Create aspect + entry types (one-time)
    node scripts/evals dataplex sync              Create/update entries from aspects YAML files
    node scripts/evals dataplex sync <entryId>    Sync only a specific entry (by file name / entry id)

  Notes:
  - The "Aspect types" console page lists *schemas*. Snapshot datasets show up under Dataplex Entries.
  - This command assumes you have gcloud installed and authenticated.
  - If you do not have Dataplex write permissions, use:
      node scripts/evals dataplex sync --print-commands
    and hand the generated command(s) to someone who does.
  `,
  flags: {
    boolean: ['dry-run', 'bootstrap', 'print-commands'],
    string: ['project', 'location', 'entry-group'],
    default: {
      'dry-run': false,
      bootstrap: false,
      'print-commands': false,
      project: DEFAULT_PROJECT,
      location: DEFAULT_LOCATION,
      'entry-group': DEFAULT_ENTRY_GROUP,
    },
  },
  run: async ({ log, flagsReader }) => {
    ensureGcloud();

    const repoRoot = process.cwd();
    const positionals = flagsReader.getPositionals();
    const action = positionals[0] ?? 'sync';

    const project = flagsReader.string('project') ?? DEFAULT_PROJECT;
    const location = flagsReader.string('location') ?? DEFAULT_LOCATION;
    const entryGroup = flagsReader.string('entry-group') ?? DEFAULT_ENTRY_GROUP;
    const dryRun = flagsReader.boolean('dry-run');
    const printCommands = flagsReader.boolean('print-commands');

    const bootstrap = flagsReader.boolean('bootstrap') || action === 'bootstrap';
    if (bootstrap) {
      maybeBootstrap(project, log);
      if (action === 'bootstrap') return;
    }

    if (action !== 'sync') {
      throw new Error(`Unknown dataplex subcommand: ${action}`);
    }

    const onlyEntryId = positionals[1] ?? undefined;
    const aspectsRootAbs = Path.resolve(repoRoot, ASPECTS_ROOT);

    if (!Fs.existsSync(aspectsRootAbs)) {
      log.warning(`No aspects directory found at ${ASPECTS_ROOT}. Nothing to sync.`);
      return;
    }

    const allYaml = listYamlFilesRecursively(aspectsRootAbs).sort();
    const selected = onlyEntryId
      ? allYaml.filter((p) => Path.basename(p, Path.extname(p)) === onlyEntryId)
      : allYaml;

    if (selected.length === 0) {
      log.warning(
        onlyEntryId ? `No aspects file found for entryId: ${onlyEntryId}` : 'No YAML files found.'
      );
      return;
    }

    const created: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];
    const printed: string[] = [];

    for (const filePath of selected) {
      const entryId = Path.basename(filePath, Path.extname(filePath));
      const data = readAspectData(filePath);
      const res = syncEntry({
        project,
        location,
        entryGroup,
        entryId,
        aspectsFile: filePath,
        gcsPath: data.gcs_path,
        description: data.description,
        dryRun,
        printCommands,
        log,
      });
      if (res.action === 'created') created.push(entryId);
      else if (res.action === 'updated') updated.push(entryId);
      else if (res.action === 'printed') printed.push(entryId);
      else skipped.push(entryId);
    }

    if (created.length) log.info(`Created: ${created.join(', ')}`);
    if (updated.length) log.info(`Updated: ${updated.join(', ')}`);
    if (printed.length) log.info(`Printed commands for: ${printed.join(', ')}`);
    if (skipped.length) log.info(`Unchanged: ${skipped.join(', ')}`);
    if (dryRun) log.info('Dry run: no changes were applied.');
  },
};
