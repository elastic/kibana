/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncateList } from '@kbn/inference-common';
import type { DocumentAnalysis, TruncatedDocumentAnalysis } from './document_analysis';
import { selectFields } from './select_fields';

export function sortAndTruncateAnalyzedFields(
  analysis: DocumentAnalysis,
  options: { dropEmpty?: boolean; dropUnmapped?: boolean; limit?: number } = {}
): TruncatedDocumentAnalysis {
  const { dropEmpty = false, dropUnmapped = false, limit = 500 } = options;

  const fields = selectFields(analysis, { dropEmpty, dropUnmapped, limit });

  return {
    ...analysis,
    fields: truncateList(
      fields.map((field) => {
        const types = field.types.join(',') || '(unmapped)';
        let label = `${field.name}:${types}`;

        if (field.empty) {
          return `${field.name} (empty)`;
        }

        const distinctValueLabel =
          typeof field.cardinality === 'number' ? field.cardinality : 'unknown';
        label += ` - ${distinctValueLabel} distinct values`;

        if (field.name === '@timestamp' || field.name === 'event.ingested') {
          return `${label}`;
        }

        const shortValues = field.values.filter(({ value }) => {
          return String(value).length <= 1024;
        });

        if (shortValues.length) {
          return `${label} (${truncateList(
            shortValues.map(({ value, count }) => {
              const valueLabel = typeof value === 'string' ? value : String(value);
              return '`' + valueLabel + '`' + ` (${count})`;
            }),
            field.types.includes('text') || field.types.includes('match_only_text') ? 2 : 10
          ).join(', ')})`;
        }

        return label;
      }),
      500
    ).sort(),
  };
}
