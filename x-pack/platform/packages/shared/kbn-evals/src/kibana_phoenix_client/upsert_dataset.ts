/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PhoenixClient } from '@arizeai/phoenix-client';
import { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import { ExampleWithId } from '../types';
import { diffExamples } from './diff_examples';

const UPSERT_DATASET = /* GraphQL */ `
  mutation UpsertDataset(
    $datasetId: ID!
    $exampleIdsToDelete: [ID!]!
    $examplesToAdd: [DatasetExampleInput!]!
  ) {
    deleteDatasetExamples(input: { exampleIds: $exampleIdsToDelete }) {
      dataset {
        name
      }
    }
    addExamplesToDataset(input: { datasetId: $datasetId, examples: $examplesToAdd }) {
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

  if (operations.toDelete.length || operations.toAdd.length) {
    await graphQLRequest<{ addExamplesToDataset: { dataset: { name: string } } }>(
      phoenixClient,
      UPSERT_DATASET,
      {
        datasetId,
        exampleIdsToDelete: operations.toDelete,
        examplesToAdd: operations.toAdd,
      }
    );
  }
}
