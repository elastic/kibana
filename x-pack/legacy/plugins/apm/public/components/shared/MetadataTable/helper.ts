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
import { flattenObject, FlattenItems } from '../../../utils/flattenObject';

type Item = Transaction | APMError | Span;

export type MetadataItems = Array<SectionType & { data?: FlattenItems }>;

export const getMetadataItems = (
  sections: SectionType[],
  item: Item
): MetadataItems => {
  return sections
    .map(section => {
      const sectionData: Record<string, unknown> = get(item, section.key);
      const sectionProperties:
        | Record<string, unknown>
        | undefined = section.properties
        ? pick(sectionData, section.properties)
        : sectionData;
      let data: FlattenItems | undefined;
      if (!isEmpty(sectionProperties)) {
        data = flattenObject(sectionProperties, section.key);
      }
      return { ...section, data };
    })
    .filter(({ required, data }) => required || !isEmpty(data));
};

export const filterItems = (items: MetadataItems, searchTerm: string) => {
  return items
    .map(item => {
      const { data = [] } = item;
      const filteredData = data.filter(({ key, value }) => {
        const valueAsString = String(value).toLowerCase();
        return (
          key.toLowerCase().includes(searchTerm) ||
          valueAsString.includes(searchTerm)
        );
      });
      return { ...item, data: filteredData };
    })
    .filter(({ data }) => !isEmpty(data));
};
