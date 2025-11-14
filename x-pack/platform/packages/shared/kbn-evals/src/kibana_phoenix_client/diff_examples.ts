/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import objectHash from 'object-hash';
import { isEmpty, omitBy } from 'lodash';
import type { ExampleWithId } from '../types';

function normaliseExample(example: Example | ExampleWithId) {
  return {
    input: example.input,
    output: example.output,
    // Phoenix sets some defaults in stored examples (like `annotations`),
    // so we emit them here
    metadata: omitBy(example.metadata, isEmpty),
  };
}

function getExampleHash(example: Example | ExampleWithId) {
  return objectHash(normaliseExample(example));
}

export function diffExamples(stored: ExampleWithId[], next: Example[]) {
  const toDelete: string[] = [];
  const toAdd: Example[] = [];

  const storedExampleIdsByHash = new Map<string, string>();

  for (const example of stored) {
    const hash = getExampleHash(example);
    storedExampleIdsByHash.set(hash, example.id);
  }

  for (const example of next) {
    const hash = getExampleHash(example);
    if (storedExampleIdsByHash.get(hash)) {
      storedExampleIdsByHash.delete(hash);
    } else {
      toAdd.push(normaliseExample(example));
    }
  }

  toDelete.push(...Array.from(storedExampleIdsByHash.values()));

  return { toDelete, toAdd };
}
