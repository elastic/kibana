/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition, shuffle } from 'lodash';
import { truncateList } from '@kbn/inference-common';
import type { DocumentAnalysis, TruncatedDocumentAnalysis } from './document_analysis';

export function sortAndTruncateAnalyzedFields(
  analysis: DocumentAnalysis
): TruncatedDocumentAnalysis {
  const { fields, ...meta } = analysis;
  const [nonEmptyFields, emptyFields] = partition(analysis.fields, (field) => !field.empty);

  const sortedFields = [...shuffle(nonEmptyFields), ...shuffle(emptyFields)];

  return {
    ...meta,
    fields: truncateList(
      sortedFields.map((field) => {
        let label = `${field.name}:${field.types.join(',')}`;

        if (field.empty) {
          return `${name} (empty)`;
        }

        label += ` - ${field.cardinality} distinct values`;

        if (field.name === '@timestamp' || field.name === 'event.ingested') {
          return `${label}`;
        }

        const shortValues = field.values.filter((value) => {
          return String(value).length <= 1024;
        });

        if (shortValues.length) {
          return `${label} (${truncateList(
            shortValues.map((value) => '`' + value + '`'),
            field.types.includes('text') || field.types.includes('match_only_text') ? 2 : 10
          ).join(', ')})`;
        }

        return label;
      }),
      500
    ).sort(),
  };
}
