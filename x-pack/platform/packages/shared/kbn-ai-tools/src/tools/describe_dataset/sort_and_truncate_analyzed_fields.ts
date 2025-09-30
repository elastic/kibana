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
  analysis: DocumentAnalysis,
  options: { dropEmpty?: boolean; dropUnmapped?: boolean } = {}
): TruncatedDocumentAnalysis {
  const { dropEmpty = false, dropUnmapped = false } = options;
  const { fields, ...meta } = analysis;
  const [nonEmptyFields, emptyFields] = partition(analysis.fields, (field) => !field.empty);

  // randomize field selection to get a somewhat more illustrative set of fields when
  // the # of fields exceeds the threshold, instead of alphabetically sorted
  // additionally, prefer non-empty fields over empty fields
  const sortedFields = [...shuffle(nonEmptyFields), ...shuffle(emptyFields)];

  const filteredFields =
    dropEmpty || dropUnmapped
      ? sortedFields.filter((field) => {
          const shouldBeDropped =
            (dropEmpty && field.empty) || (dropUnmapped && field.types.length === 0);

          return !shouldBeDropped;
        })
      : fields;

  return {
    ...meta,
    fields: truncateList(
      filteredFields.map((field) => {
        const types = field.types.join(',') || '(unnmapped)';
        let label = `${field.name}:${types}`;

        if (field.empty) {
          return `${field.name} (empty)`;
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
