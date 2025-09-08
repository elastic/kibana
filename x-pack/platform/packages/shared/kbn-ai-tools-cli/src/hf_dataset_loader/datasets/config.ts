/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { HuggingFaceDatasetSpec } from '../types';
import { createOneChatDatasetSpec, isOneChatDataset } from './onechat';

const BEIR_NAMES = [
  'trec-covid',
  'msmarco',
  'nq',
  'hotpotqa',
  'fiqa',
  'dbpedia-entity',
  'robust04',
  'touche-2020',
  'arguana',
  'climate-fever',
  'scifact',
  'scidocs',
  'quora',
];

const INFERENCE_ENDPOINT = `.elser-2-elasticsearch`;

const SEMANTIC_TEXT = {
  type: 'semantic_text' as const,
  inference_id: INFERENCE_ENDPOINT,
};

const BEIR_DATASETS: HuggingFaceDatasetSpec[] = BEIR_NAMES.map((name) => ({
  name: `beir-${name}`,
  repo: `BeIR/${name}`,
  file: 'corpus.jsonl.gz',
  revision: 'main',
  index: `beir-${name}`,
  mapDocument: (r) => ({
    _id: r._id,
    title: r.title,
    content: r.text,
  }),
  mapping: {
    properties: {
      title: SEMANTIC_TEXT,
      content: SEMANTIC_TEXT,
    },
  },
}));

const EXTRA_DATASETS: HuggingFaceDatasetSpec[] = [
  {
    name: 'huffpost',
    repo: 'khalidalt/HuffPost',
    file: 'News_Category_Dataset_v2.json',
    index: 'huffpost',
    mapDocument: (r) => ({
      _id: r.link,
      title: r.headline,
      content: r.short_description,
      date: r.date,
      author: r.authors,
      category: r.category,
    }),
    mapping: {
      properties: {
        title: SEMANTIC_TEXT,
        content: SEMANTIC_TEXT,
        author: {
          type: 'keyword',
        },
        category: {
          type: 'keyword',
        },
        date: {
          type: 'date',
        },
      },
    },
  },
];

export const PREDEFINED_HUGGING_FACE_DATASETS: HuggingFaceDatasetSpec[] = [
  ...BEIR_DATASETS,
  ...EXTRA_DATASETS,
];

/**
 * Get dataset specifications, including dynamically generated OneChat datasets
 */
export async function getDatasetSpecs(
  accessToken: string,
  logger: Logger,
  datasetNames: string[]
): Promise<HuggingFaceDatasetSpec[]> {
  const specs: HuggingFaceDatasetSpec[] = [];
  for (const name of datasetNames) {
    if (isOneChatDataset(name)) {
      const spec = await createOneChatDatasetSpec(name, accessToken, logger);
      specs.push(spec);
    } else {
      // Look for static datasets
      const staticSpec = PREDEFINED_HUGGING_FACE_DATASETS.find((spec) => spec.name === name);
      if (staticSpec) {
        specs.push(staticSpec);
      } else {
        throw new Error(`Dataset '${name}' not found`);
      }
    }
  }

  return specs;
}
