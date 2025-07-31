/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { createKibanaClient, toolingLogToLogger } from '@kbn/kibana-api-cli';
import { castArray, keyBy } from 'lodash';
import { loadHuggingFaceDatasets } from '../src/hf_dataset_loader/load_hugging_face_datasets';
import { ALL_HUGGING_FACE_DATASETS } from '../src/hf_dataset_loader/config';

interface Flags {
  // the number of rows per dataset to load into ES
  limit?: string;
  // the names of the datasets to load
  datasets?: string | string[];
  // whether all specified dataset's indices should be cleared before loading
  clear?: boolean;
}

run(
  async ({ log, flags }) => {
    const signal = new AbortController().signal;

    const accessToken = process.env.HUGGING_FACE_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error(
        `process.env.HUGGING_FACE_ACCESS_TOKEN not set - this is required for API access`
      );
    }

    const kibanaClient = await createKibanaClient({
      log,
      signal,
    });

    // destructure and normalize CLI flags
    const { limit, datasets, clear } = flags as Flags;

    const datasetNames = !!datasets
      ? castArray(datasets)
          .flatMap((set) => set.split(','))
          .map((set) => set.trim())
          .filter(Boolean)
      : undefined;

    const specsByName = keyBy(ALL_HUGGING_FACE_DATASETS, (val) => val.name);

    const specs =
      datasetNames?.map((name) => {
        if (!specsByName[name]) {
          throw new Error(`Dataset spec for ${name} not found`);
        }
        return specsByName[name];
      }) ?? ALL_HUGGING_FACE_DATASETS;

    if (!specs.length) {
      throw new Error(`No datasets to load`);
    }

    await loadHuggingFaceDatasets({
      esClient: kibanaClient.es,
      logger: toolingLogToLogger({ flags, log }),
      clear: Boolean(clear),
      limit: !!limit ? Number(limit) : undefined,
      datasets: specs,
      accessToken,
    });
  },
  {
    description: `Loads HuggingFace datasets into an Elasticsearch cluster`,
    flags: {
      string: ['limit', 'datasets'],
      boolean: ['clear'],
      help: `
        Usage: node --require ./src/setup_node_env/index.js x-pack/platform/packages/shared/kbn-ai-tools-cli/scripts/hf_dataset_loader.ts [options]

        --datasets          Comma-separated list of HuggingFace dataset names to load
        --limit             Number of rows per dataset to load into Elasticsearch
        --clear             Clear the existing indices for the specified datasets before loading
      `,
      default: {
        clear: false,
      },
      allowUnexpected: false,
    },
  }
);
