/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countBy, get, orderBy } from 'lodash';
import type { FlattenRecord } from '@kbn/streams-schema';

export const PRIORITIZED_CONTENT_FIELDS = [
  'message',
  'body.text',
  'error.message',
  'event.original',
  'attributes.exception.message',
];

export const getDefaultTextField = (
  sampleDocs: FlattenRecord[],
  prioritizedFields: string[]
): string => {
  const acceptableDefaultFields = sampleDocs.flatMap((doc) =>
    Object.keys(doc).filter((key) => prioritizedFields.includes(key))
  );
  const acceptableFieldsOccurrences = countBy(acceptableDefaultFields);

  const sortedFields = orderBy(
    Object.entries(acceptableFieldsOccurrences),
    [([_field, occurrencies]) => occurrencies, ([field]) => prioritizedFields.indexOf(field)],
    ['desc', 'asc']
  );

  const mostCommonField = sortedFields[0];
  return mostCommonField ? mostCommonField[0] : '';
};

export const extractMessagesFromField = (samples: FlattenRecord[], fieldName: string): string[] => {
  return samples.reduce<string[]>((acc, sample) => {
    const value = get(sample, fieldName);
    if (typeof value === 'string') {
      acc.push(value);
    }
    return acc;
  }, []);
};
