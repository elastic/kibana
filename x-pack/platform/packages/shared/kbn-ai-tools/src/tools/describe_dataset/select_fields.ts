/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition, shuffle } from 'lodash';
import type { DocumentAnalysis } from './document_analysis';

export function selectFields(
  analysis: DocumentAnalysis,
  { dropEmpty, dropUnmapped, limit }: { dropUnmapped: boolean; dropEmpty: boolean; limit: number }
) {
  const filteredFields = analysis.fields.filter((field) => {
    if (dropEmpty && field.empty) {
      return false;
    }

    if (dropUnmapped && field.types.length === 0) {
      return false;
    }

    return true;
  });

  const [nonEmptyFields, emptyFields] = partition(filteredFields, (field) => !field.empty);

  // randomize field selection to get a somewhat more illustrative set of fields when
  // the # of fields exceeds the threshold, instead of alphabetically sorted
  // additionally, prefer non-empty fields over empty fields

  const prioritizedFields = [...shuffle(nonEmptyFields), ...shuffle(emptyFields)];
  const limitedFields = prioritizedFields.slice(0, Math.max(0, limit));
  return limitedFields;
}
