/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { createKibanaClient, toolingLogToLogger } from '@kbn/kibana-api-cli';
import { castArray } from 'lodash';
import { loadHuggingFaceDatasets } from '../src/hf_dataset_loader/load_hugging_face_datasets';
import {
  PREDEFINED_HUGGING_FACE_DATASETS,
  getDatasetSpecs,
} from '../src/hf_dataset_loader/datasets/config';
import { listAllAgentBuilderDatasets } from '../src/hf_dataset_loader/datasets/agent_builder';
import type { HuggingFaceDatasetSpec } from '../src/hf_dataset_loader/types';

interface Flags {
  // the number of rows per dataset to load into ES
  limit?: string;
  // the names of the datasets to load
  datasets?: string | string[];
  // whether all specified dataset's indices should be cleared before loading
  clear?: boolean;
  // the kibana URL to connect to
  'kibana-url'?: string;
}

async function showAvailableDatasets(accessToken: string, logger: any) {
  let output = 'No datasets specified. Here are the available datasets:\n\n';

  output += 'Pre-defined HuggingFace datasets:\n';
  output += PREDEFINED_HUGGING_FACE_DATASETS.map((d, index) => `  ${index + 1}. ${d.name}`).join(
    '\n'
  );
  output += '\n\n';

  const agentBuilderDatasets = await listAllAgentBuilderDatasets(accessToken, logger);
  output += 'AgentBuilder datasets:\n';
  if (agentBuilderDatasets.length > 0) {
    output += agentBuilderDatasets.map((dataset, index) => `  ${index + 1}. ${dataset}`).join('\n');
  } else {
    output +=
      '  (none available - you may need to join Elastic oranization on HuggingFace to access AgentBuilder datasets)';
  }

  output += '\n\n';
  output += 'Usage: Use --datasets to specify which datasets to load\n';
  output += 'Example: --datasets agent_builder/knowledge-base/wix_knowledge_base';

  logger.info(output);
}

run(
  async ({ log, flags }) => {
    const signal = new AbortController().signal;
    const logger = toolingLogToLogger({ flags, log });

    const accessToken = process.env.HUGGING_FACE_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error(
        `process.env.HUGGING_FACE_ACCESS_TOKEN not set - this is required for API access`
      );
    }

    // destructure and normalize CLI flags
    const { limit, datasets, clear } = flags as Flags;
    const kibanaUrl = typeof flags['kibana-url'] === 'string' ? flags['kibana-url'] : undefined;

    const kibanaClient = await createKibanaClient({
      log,
      signal,
      baseUrl: kibanaUrl,
    });

    const datasetNames = !!datasets
      ? castArray(datasets)
          .flatMap((set) => set.split(','))
          .map((set) => set.trim())
          .filter(Boolean)
      : undefined;

    let specs: HuggingFaceDatasetSpec[];

    if (datasetNames) {
      specs = await getDatasetSpecs(accessToken, logger, datasetNames);
    } else {
      // Show available datasets and exit
      await showAvailableDatasets(accessToken, logger);
      return;
    }

    if (!specs.length) {
      throw new Error(`No datasets to load`);
    }

    await loadHuggingFaceDatasets({
      esClient: kibanaClient.es,
      logger,
      clear: Boolean(clear),
      limit: !!limit ? Number(limit) : undefined,
      datasets: specs,
      accessToken,
    });
  },
  {
    description: `Loads HuggingFace datasets into an Elasticsearch cluster`,
    flags: {
      string: ['limit', 'datasets', 'kibana-url'],
      boolean: ['clear'],
      help: `
        Usage: node --require ./src/setup_node_env/index.js x-pack/platform/packages/shared/kbn-ai-tools-cli/scripts/hf_dataset_loader.ts [options]

        --datasets          Comma-separated list of HuggingFace dataset names to load.
                           For AgentBuilder datasets, use format: agent_builder/<directory>/<dataset_name>
                           Example: --datasets agent_builder/knowledge-base/wix_knowledge_base
        --limit             Number of rows per dataset to load into Elasticsearch
        --clear             Clear the existing indices for the specified datasets before loading
        --kibana-url        Kibana URL to connect to (bypasses auto-discovery when provided)
      `,
      default: {
        clear: false,
      },
      allowUnexpected: false,
    },
  }
);
