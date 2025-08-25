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

const MUTATION_OPERATIONS = {
  delete: {
    param: '$exampleIdsToDelete: [ID!]!',
    operation: `
    deleteDatasetExamples(input: { exampleIds: $exampleIdsToDelete }) {
      dataset {
        name
      }
    }`,
  },
  add: {
    param: '$examplesToAdd: [DatasetExampleInput!]!',
    operation: `
    addExamplesToDataset(input: { datasetId: $datasetId, examples: $examplesToAdd }) {
      dataset {
        name
      }
    }`,
  },
} as const;

function buildUpsertMutation(operations: Array<keyof typeof MUTATION_OPERATIONS>): string {
  const params = ['$datasetId: ID!', ...operations.map((op) => MUTATION_OPERATIONS[op].param)].join(
    ', '
  );
  const operationStrings = operations.map((op) => MUTATION_OPERATIONS[op].operation).join('');
  return /* GraphQL */ `
    mutation UpsertDataset(${params}) {${operationStrings}
    }
  `;
}

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
    const requiredOperations: Array<keyof typeof MUTATION_OPERATIONS> = [];
    const mutationVariables: Record<string, unknown> = { datasetId };

    if (operations.toDelete.length > 0) {
      requiredOperations.push('delete');
      mutationVariables.exampleIdsToDelete = operations.toDelete;
    }
    if (operations.toAdd.length > 0) {
      requiredOperations.push('add');
      mutationVariables.examplesToAdd = operations.toAdd;
    }

    const mutation = buildUpsertMutation(requiredOperations);

    await graphQLRequest<{ addExamplesToDataset: { dataset: { name: string } } }>(
      phoenixClient,
      mutation,
      mutationVariables
    );
  }
}
