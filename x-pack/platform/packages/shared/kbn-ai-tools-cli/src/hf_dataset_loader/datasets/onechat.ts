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

const ONECHAT_REPO = 'elastic/OneChatAgent';

interface OneChatIndexMapping {
  name: string;
  mappings: any;
}

// Cache mappings per directory to support multiple categories
const cachedMappings: Map<string, Map<string, OneChatIndexMapping>> = new Map();

/**
 * Fetches and caches the index mappings from the OneChat repository for a specific directory
 */
export async function getOneChatIndexMappings(
  directory: string,
  accessToken: string,
  logger: Logger
): Promise<Map<string, OneChatIndexMapping>> {
  if (cachedMappings.has(directory)) {
    return cachedMappings.get(directory)!;
  }

  logger.debug(`Fetching OneChat index mappings for directory: ${directory}`);

  const onechatMappingsFileContent = await getFileContent(
    {
      repo: ONECHAT_REPO,
      path: `${directory}/index-mappings.jsonl`,
      revision: 'main',
      accessToken,
    },
    logger
  );

  const mappings = new Map<string, OneChatIndexMapping>();

  const lines = onechatMappingsFileContent.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const mapping: OneChatIndexMapping = JSON.parse(line);
      mappings.set(mapping.name, mapping);
    } catch (error) {
      logger.warn(`Failed to parse mapping line: ${line}`, error);
    }
  }

  cachedMappings.set(directory, mappings);

  logger.debug(`Loaded ${mappings.size} OneChat index mappings for directory: ${directory}`);
  return mappings;
}

/**
 * Parses OneChat dataset name to extract directory and dataset name
 * Format: onechat/<directory>/<dataset> -> { directory: "directory", dataset: "dataset" }
 */
function parseOneChatDatasetName(datasetName: string): { directory: string; dataset: string } {
  // Remove "onechat/" prefix
  const withoutPrefix = datasetName.startsWith('onechat/')
    ? datasetName.slice('onechat/'.length)
    : datasetName;

  const parts = withoutPrefix.split('/');
  if (parts.length !== 2) {
    throw new Error(
      `Invalid OneChat dataset format: '${datasetName}'. Expected format: onechat/<directory>/<dataset>, got ${datasetName}.`
    );
  }

  return {
    directory: parts[0],
    dataset: parts[1],
  };
}

/**
 * Creates a HuggingFaceDatasetSpec for a OneChat dataset
 */
export async function createOneChatDatasetSpec(
  datasetName: string,
  accessToken: string,
  logger: Logger
): Promise<HuggingFaceDatasetSpec> {
  const { directory, dataset } = parseOneChatDatasetName(datasetName);

  const mappings = await getOneChatIndexMappings(directory, accessToken, logger);
  const mapping = mappings.get(dataset);

  if (!mapping) {
    const availableDatasets = Array.from(mappings.keys()).join(', ');
    throw new Error(
      `OneChat dataset '${dataset}' not found in directory '${directory}'. Available datasets: ${availableDatasets}`
    );
  }

  logger.debug(`Creating dataset spec for OneChat dataset: ${datasetName}`);
  return {
    name: datasetName,
    repo: ONECHAT_REPO,
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
 * Checks if a dataset name refers to a OneChat dataset
 * Expected format: onechat/<directory>/<dataset>
 */
export function isOneChatDataset(datasetName: string): boolean {
  return datasetName.startsWith('onechat/') && datasetName.split('/').length === 3;
}

export function isOneChatWildcard(datasetName: string): boolean {
  return isOneChatDataset(datasetName) && datasetName.endsWith('/*');
}

/**
 * Lists all available OneChat datasets for a specific directory
 */
export async function listOneChatDatasets(
  directory: string,
  accessToken: string,
  logger: Logger
): Promise<string[]> {
  const mappings = await getOneChatIndexMappings(directory, accessToken, logger);
  return Array.from(mappings.keys()).map((name) => `onechat/${directory}/${name}`);
}

/**
 * Lists all available OneChat datasets across common directories
 * This is a convenience function that tries common directory names
 */
export async function listAllOneChatDatasets(
  accessToken: string,
  logger: Logger
): Promise<string[]> {
  const commonDirectories = ['knowledge-base']; // Add more as they become available
  const allDatasets: string[] = [];

  for (const directory of commonDirectories) {
    try {
      const datasets = await listOneChatDatasets(directory, accessToken, logger);
      allDatasets.push(...datasets);
    } catch (error) {
      logger.debug(`Could not fetch datasets from directory '${directory}': ${error}`);
    }
  }

  return allDatasets;
}
