/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { InferenceDocument } from './utils/format_raw_document';

type Fields = Record<string, unknown>;

interface SerializedDocument {
  _id?: string;
  fields: Fields;
}

interface SerializedGroup {
  shared_fields?: Fields;
  documents: SerializedDocument[];
}

interface SerializedDocuments {
  shared_fields?: Fields;
  groups: SerializedGroup[];
}

const MISSING = Symbol('missing');

const serializedLength = (value: unknown): number => JSON.stringify(value)?.length ?? 0;

// A multi-field (`host.name.text`) repeats its parent's value under a longer name.
const dropParentDuplicates = (fields: Fields): Fields =>
  Object.fromEntries(
    Object.entries(fields).filter(([key, value]) => {
      const separator = key.lastIndexOf('.');
      if (separator === -1) {
        return true;
      }
      const parent = key.slice(0, separator);
      return !(parent in fields && isEqual(fields[parent], value));
    })
  );

const extractSharedFields = (
  documents: InferenceDocument[]
): { shared: Fields; documents: InferenceDocument[] } => {
  const [first, ...others] = documents;
  if (others.length === 0) {
    return { shared: {}, documents };
  }
  const shared = Object.fromEntries(
    Object.entries(first.fields).filter(([key, value]) =>
      others.every((document) => key in document.fields && isEqual(document.fields[key], value))
    )
  );
  return {
    shared,
    documents: documents.map((document) => ({
      ...document,
      fields: Object.fromEntries(
        Object.entries(document.fields).filter(([key]) => !(key in shared))
      ),
    })),
  };
};

const partitionByField = (documents: InferenceDocument[], field: string): InferenceDocument[][] => {
  const partitions = new Map<string | typeof MISSING, InferenceDocument[]>();
  for (const document of documents) {
    const key = field in document.fields ? JSON.stringify(document.fields[field]) : MISSING;
    partitions.set(key, [...(partitions.get(key) ?? []), document]);
  }
  return [...partitions.values()];
};

const sharedLength = (partition: InferenceDocument[]): number =>
  Object.entries(extractSharedFields(partition).shared).reduce(
    (total, [key, value]) =>
      total + (key.length + serializedLength(value)) * (partition.length - 1),
    0
  );

const groupDocuments = (documents: InferenceDocument[]): InferenceDocument[][] => {
  const candidateFields = new Set(documents.flatMap(({ fields }) => Object.keys(fields)));
  let best: { saved: number; partitions: InferenceDocument[][] } = {
    saved: 0,
    partitions: [documents],
  };
  for (const field of candidateFields) {
    const partitions = partitionByField(documents, field);
    if (partitions.length === 1 || partitions.length === documents.length) {
      continue;
    }
    const saved = partitions.reduce((total, partition) => total + sharedLength(partition), 0);
    if (saved > best.saved) {
      best = { saved, partitions };
    }
  }
  return best.partitions;
};

/**
 * Serializes sample documents for the feature identification prompt without repeating what they have in common.
 */
export const serializeInferenceDocuments = (documents: InferenceDocument[]): string => {
  const deduplicated = documents.map((document) => ({
    ...document,
    fields: dropParentDuplicates(document.fields),
  }));
  const { shared, documents: remaining } = extractSharedFields(deduplicated);

  const groups = groupDocuments(remaining).map((partition): SerializedGroup => {
    const { shared: groupShared, documents: groupDocs } = extractSharedFields(partition);
    return {
      ...(Object.keys(groupShared).length > 0 ? { shared_fields: groupShared } : {}),
      documents: groupDocs.map(({ _id, fields }) => ({ _id, fields })),
    };
  });

  const serialized: SerializedDocuments = {
    ...(Object.keys(shared).length > 0 ? { shared_fields: shared } : {}),
    groups,
  };
  return JSON.stringify(serialized);
};
