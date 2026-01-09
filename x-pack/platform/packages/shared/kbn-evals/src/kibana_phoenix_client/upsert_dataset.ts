/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PhoenixClient } from '@arizeai/phoenix-client';
import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type { ExampleWithId } from '../types';
import { diffExamples } from './diff_examples';

const DELETE_DATASET_EXAMPLES = /* GraphQL */ `
  mutation DeleteDatasetExamples($exampleIds: [ID!]!) {
    deleteDatasetExamples(input: { exampleIds: $exampleIds }) {
      dataset {
        name
      }
    }
  }
`;

const ADD_DATASET_EXAMPLES = /* GraphQL */ `
  mutation AddExamplesToDataset($datasetId: ID!, $examples: [DatasetExampleInput!]!) {
    addExamplesToDataset(input: { datasetId: $datasetId, examples: $examples }) {
      dataset {
        name
      }
    }
  }
`;

async function graphQLRequest<T>(
  client: PhoenixClient,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${client.config.baseUrl}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(client.config.headers as Record<string, string>),
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  return body.data as T;
}

/**
 * Upserts a dataset. Phoenix doesn't allow to do this through its
 * REST API (yet), so we use GraphQL to remove/append examples from
 * the stored dataset, based on the examples in memory, matching
 * them by content.
 */
export async function upsertDataset({
  phoenixClient,
  datasetId,
  storedExamples,
  nextExamples,
}: {
  phoenixClient: PhoenixClient;
  datasetId: string;
  storedExamples: ExampleWithId[];
  nextExamples: Example[];
}) {
  const operations = diffExamples(storedExamples, nextExamples);

  // Phoenix' GraphQL endpoint can be sensitive to very large payloads. Chunk deletes/additions so
  // large suites (or repeated runs) don't fail with generic GraphQL errors.
  const DELETE_CHUNK_SIZE = 200;
  const ADD_CHUNK_SIZE = 50;

  for (let i = 0; i < operations.toDelete.length; i += DELETE_CHUNK_SIZE) {
    const exampleIds = operations.toDelete.slice(i, i + DELETE_CHUNK_SIZE);
    await graphQLRequest<{ deleteDatasetExamples: { dataset: { name: string } } }>(
      phoenixClient,
      DELETE_DATASET_EXAMPLES,
      { exampleIds }
    );
  }

  for (let i = 0; i < operations.toAdd.length; i += ADD_CHUNK_SIZE) {
    const examples = operations.toAdd.slice(i, i + ADD_CHUNK_SIZE);
    await graphQLRequest<{ addExamplesToDataset: { dataset: { name: string } } }>(
      phoenixClient,
      ADD_DATASET_EXAMPLES,
      { datasetId, examples }
    );
  }
}
