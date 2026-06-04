/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import type { FlagsReader } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { readCachedEisConnectors } from './eis_connectors_cache';
import { promptForConnector, promptForProject, isTTY } from './prompts';
import { defaultExportProfile, envFromDatasetsProfile, envFromExportProfile } from './profiles';

export interface RunContext {
  evaluationConnectorId: string;
  projects: string[];
  profileEnvOverrides: Record<string, string>;
  exportProfile: string | undefined;
}

/**
 * Resolves the common run-time context shared by `start` and `red-team`:
 * - Loads EIS connectors from cache into the process environment (if not already set)
 * - Resolves the evaluation connector ID (flag → env → interactive prompt)
 * - Resolves profile env overrides from --profile / --datasets-profile / --export-profile
 * - Resolves target projects (flag → interactive prompt)
 *
 * Each command appends its own specific env vars to the returned `profileEnvOverrides`.
 */
export const resolveRunContext = async (
  repoRoot: string,
  log: ToolingLog,
  flagsReader: FlagsReader,
  options?: { baseProfile?: string }
): Promise<RunContext> => {
  if (!process.env.KIBANA_TESTING_AI_CONNECTORS) {
    const cached = readCachedEisConnectors();
    if (cached) {
      process.env.KIBANA_TESTING_AI_CONNECTORS = Buffer.from(JSON.stringify(cached)).toString(
        'base64'
      );
      log.info('EIS connectors loaded from cache (~/.elastic/eis-connectors-cache.json)');
    }
  }

  let evaluationConnectorId =
    flagsReader.string('evaluation-connector-id') ?? process.env.EVALUATION_CONNECTOR_ID;

  if (!evaluationConnectorId) {
    if (isTTY()) {
      evaluationConnectorId = await promptForConnector(repoRoot, log);
    } else {
      throw createFlagError(
        'EVALUATION_CONNECTOR_ID is required. Set --evaluation-connector-id or env.'
      );
    }
  }

  const baseProfile = options?.baseProfile ?? flagsReader.string('profile') ?? undefined;
  const datasetsProfile = flagsReader.string('datasets-profile') ?? baseProfile;
  const exportProfile =
    flagsReader.string('export-profile') ?? baseProfile ?? defaultExportProfile(repoRoot);

  const profileEnvOverrides: Record<string, string> = {
    ...envFromDatasetsProfile(repoRoot, datasetsProfile),
    ...envFromExportProfile(repoRoot, exportProfile, {
      defaultTracingExporters: exportProfile === 'local',
    }),
  };

  let projects: string[] = [];
  const projectFlag = flagsReader.string('project');
  if (projectFlag) {
    projects = projectFlag.split(',').map((p) => p.trim());
  } else if (isTTY()) {
    projects = await promptForProject(repoRoot, log);
  }

  return { evaluationConnectorId, projects, profileEnvOverrides, exportProfile };
};
