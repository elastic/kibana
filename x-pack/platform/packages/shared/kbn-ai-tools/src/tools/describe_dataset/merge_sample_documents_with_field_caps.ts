/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, sortBy, uniq } from 'lodash';
import { FieldCapsResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { getFlattenedObject } from '@kbn/std';
import type { DocumentAnalysis } from './document_analysis';

export function mergeSampleDocumentsWithFieldCaps({
  total,
  hits,
  fieldCaps,
}: {
  total: number;
  hits: SearchHit[];
  fieldCaps: FieldCapsResponse;
}): DocumentAnalysis {
  const nonEmptyFields = new Set<string>();
  const fieldValues = new Map<string, Array<string | number | boolean>>();

  const samples = hits.map((hit) => ({
    ...hit.fields,
    ...getFlattenedObject(hit._source ?? {}),
  }));

  const specs = Object.entries(fieldCaps.fields).map(([name, capabilities]) => {
    return { name, esTypes: Object.keys(capabilities) };
  });

  const typesByFields = new Map(
    specs.map(({ name, esTypes }) => {
      return [name, esTypes ?? []];
    })
  );

  for (const document of samples) {
    Object.keys(document).forEach((field) => {
      if (!nonEmptyFields.has(field)) {
        nonEmptyFields.add(field);
      }

      if (!typesByFields.has(field)) {
        typesByFields.set(field, []);
      }

      const values = castArray(document[field]);

      const currentFieldValues = fieldValues.get(field) ?? [];

      values.forEach((value) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          currentFieldValues.push(value);
        }
      });

      fieldValues.set(field, currentFieldValues);
    });
  }

  const fields = Array.from(typesByFields.entries()).flatMap(([name, types]) => {
    const values = fieldValues.get(name);

    const countByValues = new Map<string | number | boolean, number>();

    values?.forEach((value) => {
      const currentCount = countByValues.get(value) ?? 0;
      countByValues.set(value, currentCount + 1);
    });

    const sortedValues = sortBy(
      Array.from(countByValues.entries()).map(([value, count]) => {
        return {
          value,
          count,
        };
      }),
      'count',
      'desc'
    );

    return {
      name,
      types,
      empty: !nonEmptyFields.has(name),
      cardinality: countByValues.size || null,
      values: uniq(sortedValues.flatMap(({ value }) => value)),
    };
  });

  return {
    total,
    sampled: samples.length,
    fields,
  };
}
