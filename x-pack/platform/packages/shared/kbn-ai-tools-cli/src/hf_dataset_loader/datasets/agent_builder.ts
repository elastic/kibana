/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { randomUUID } from 'crypto';
import type { HuggingFaceDatasetSpec } from '../types';
import { getFileContent } from '../huggingface_utils';

const AGENTBUILDER_REPO = 'elastic/AgentBuilderAgent';

interface AgentBuilderIndexMapping {
  name: string;
  mappings: any;
}

// Cache mappings per directory to support multiple categories
const cachedMappings: Map<string, Map<string, AgentBuilderIndexMapping>> = new Map();

/**
 * Fetches and caches the index mappings from the AgentBuilder repository for a specific directory
 */
export async function getAgentBuilderIndexMappings(
  directory: string,
  accessToken: string,
  logger: Logger
): Promise<Map<string, AgentBuilderIndexMapping>> {
  if (cachedMappings.has(directory)) {
    return cachedMappings.get(directory)!;
  }

  logger.debug(`Fetching AgentBuilder index mappings for directory: ${directory}`);

  const agentBuilderMappingsFileContent = await getFileContent(
    {
      repo: AGENTBUILDER_REPO,
      path: `${directory}/index-mappings.jsonl`,
      revision: 'main',
      accessToken,
    },
    logger
  );

  const mappings = new Map<string, AgentBuilderIndexMapping>();

  const lines = agentBuilderMappingsFileContent.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const mapping: AgentBuilderIndexMapping = JSON.parse(line);
      mappings.set(mapping.name, mapping);
    } catch (error) {
      logger.warn(`Failed to parse mapping line: ${line}`, error);
    }
  }

  cachedMappings.set(directory, mappings);

  logger.debug(`Loaded ${mappings.size} AgentBuilder index mappings for directory: ${directory}`);
  return mappings;
}

/**
 * Parses AgentBuilder dataset name to extract directory and dataset name
 * Format: agent_builder/<directory>/<dataset> -> { directory: "directory", dataset: "dataset" }
 */
function parseAgentBuilderDatasetName(datasetName: string): { directory: string; dataset: string } {
  // Remove "agent_builder/" prefix
  const withoutPrefix = datasetName.startsWith('agent_builder/')
    ? datasetName.slice('agent_builder/'.length)
    : datasetName;

  const parts = withoutPrefix.split('/');
  if (parts.length !== 2) {
    throw new Error(
      `Invalid AgentBuilder dataset format: '${datasetName}'. Expected format: agent_builder/<directory>/<dataset>, got ${datasetName}.`
    );
  }

  return {
    directory: parts[0],
    dataset: parts[1],
  };
}

/**
 * Creates a HuggingFaceDatasetSpec for a AgentBuilder dataset
 */
export async function createAgentBuilderDatasetSpec(
  datasetName: string,
  accessToken: string,
  logger: Logger
): Promise<HuggingFaceDatasetSpec> {
  const { directory, dataset } = parseAgentBuilderDatasetName(datasetName);

  const mappings = await getAgentBuilderIndexMappings(directory, accessToken, logger);
  const mapping = mappings.get(dataset);

  if (!mapping) {
    const availableDatasets = Array.from(mappings.keys()).join(', ');
    throw new Error(
      `AgentBuilder dataset '${dataset}' not found in directory '${directory}'. Available datasets: ${availableDatasets}`
    );
  }

  logger.debug(`Creating dataset spec for AgentBuilder dataset: ${datasetName}`);
  return {
    name: datasetName,
    repo: AGENTBUILDER_REPO,
    file: `${directory}/datasets/${dataset}.csv`,
    revision: 'main',
    index: dataset,
    mapping: {
      properties: mapping.mappings.properties,
      _meta: mapping.mappings._meta,
    },
    mapDocument: (r) => {
      return { ...r, _id: r.id ?? randomUUID() }; // Use 'id' field or generate a new UUID
    },
  };
}

/**
 * Checks if a dataset name refers to a AgentBuilder dataset
 * Expected format: agent_builder/<directory>/<dataset>
 */
export function isAgentBuilderDataset(datasetName: string): boolean {
  return datasetName.startsWith('agent_builder/') && datasetName.split('/').length === 3;
}

export function isAgentBuilderWildcard(datasetName: string): boolean {
  return isAgentBuilderDataset(datasetName) && datasetName.endsWith('/*');
}

/**
 * Lists all available AgentBuilder datasets for a specific directory
 */
export async function listAgentBuilderDatasets(
  directory: string,
  accessToken: string,
  logger: Logger
): Promise<string[]> {
  const mappings = await getAgentBuilderIndexMappings(directory, accessToken, logger);
  return Array.from(mappings.keys()).map((name) => `agent_builder/${directory}/${name}`);
}

/**
 * Lists all available AgentBuilder datasets across common directories
 * This is a convenience function that tries common directory names
 */
export async function listAllAgentBuilderDatasets(
  accessToken: string,
  logger: Logger
): Promise<string[]> {
  const commonDirectories = ['knowledge-base']; // Add more as they become available
  const allDatasets: string[] = [];

  for (const directory of commonDirectories) {
    try {
      const datasets = await listAgentBuilderDatasets(directory, accessToken, logger);
      allDatasets.push(...datasets);
    } catch (error) {
      logger.debug(`Could not fetch datasets from directory '${directory}': ${error}`);
    }
  }

  return allDatasets;
}
