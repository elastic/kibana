/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, pick, isEmpty } from 'lodash';
import { Section as SectionType } from './sections';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { APMError } from '../../../../typings/es_schemas/ui/APMError';
import { Span } from '../../../../typings/es_schemas/ui/Span';
import { flattenObject, KeyValuePair } from '../../../utils/flattenObject';

export type MetadataItems = Array<SectionType & { rows?: KeyValuePair[] }>;

export const getMetadataItems = (
  sections: SectionType[],
  apmDoc: Transaction | APMError | Span
): MetadataItems => {
  return sections
    .map(section => {
      const sectionData: Record<string, unknown> = get(apmDoc, section.key);
      const sectionProperties:
        | Record<string, unknown>
        | undefined = section.properties
        ? pick(sectionData, section.properties)
        : sectionData;

      const rows: KeyValuePair[] = isEmpty(sectionProperties)
        ? []
        : flattenObject(sectionProperties, section.key);
      return { ...section, rows };
    })
    .filter(({ required, rows }) => required || !isEmpty(rows));
};

export const filterItems = (
  metadataItems: MetadataItems,
  searchTerm: string
) => {
  if (!searchTerm) {
    return metadataItems;
  }
  return metadataItems
    .map(item => {
      const { rows = [] } = item;
      const filteredRows = rows.filter(({ key, value }) => {
        const valueAsString = String(value).toLowerCase();
        return (
          key.toLowerCase().includes(searchTerm) ||
          valueAsString.includes(searchTerm)
        );
      });
      return { ...item, rows: filteredRows };
    })
    .filter(({ rows }) => !isEmpty(rows));
};
