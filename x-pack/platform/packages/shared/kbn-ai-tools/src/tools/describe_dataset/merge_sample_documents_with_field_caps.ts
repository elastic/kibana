/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, sortBy } from 'lodash';
import type { FieldCapsResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
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
  const valueDocCountsByField = new Map<string, Map<string | number | boolean, number>>();
  const docsWithValueByField = new Map<string, number>();

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
    const fieldsWithValuesInDocument = new Set<string>();

    Object.entries(document).forEach(([field, rawValue]) => {
      if (!typesByFields.has(field)) {
        typesByFields.set(field, []);
      }

      const values = castArray(rawValue).filter((value) => {
        return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
      });

      if (values.length === 0) {
        return;
      }

      const uniqueValues = new Set<string | number | boolean>(values);
      fieldsWithValuesInDocument.add(field);

      let valueDocCounts = valueDocCountsByField.get(field);
      if (!valueDocCounts) {
        valueDocCounts = new Map();
        valueDocCountsByField.set(field, valueDocCounts);
      }

      uniqueValues.forEach((value) => {
        const currentCount = valueDocCounts!.get(value) ?? 0;
        valueDocCounts!.set(value, currentCount + 1);
      });
    });

    fieldsWithValuesInDocument.forEach((field) => {
      const currentCount = docsWithValueByField.get(field) ?? 0;
      docsWithValueByField.set(field, currentCount + 1);
    });
  }

  const allFieldNames = Array.from(
    new Set([...typesByFields.keys(), ...valueDocCountsByField.keys()])
  );

  const fields = allFieldNames.map((name) => {
    const types = typesByFields.get(name) ?? [];
    const valueDocCounts = valueDocCountsByField.get(name) ?? new Map();
    const docsWithValue = docsWithValueByField.get(name) ?? 0;

    const sortedValues = sortBy(
      Array.from(valueDocCounts.entries()).map(([value, count]) => {
        return {
          value,
          count,
        };
      }),
      ({ count }) => -count
    );

    return {
      name,
      types,
      empty: docsWithValue === 0,
      cardinality: valueDocCounts.size > 0 ? valueDocCounts.size : null,
      values: sortedValues,
      documentsWithValue: docsWithValue,
    };
  });

  return {
    total,
    sampled: samples.length,
    fields,
  };
}
