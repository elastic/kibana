/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, pick, isEmpty } from 'lodash';
import { pathify } from '../DottedKeyValueTable';
import { Section as SectionType } from './sections';
import { Item } from './';

const filterData = (data: Record<string, unknown>, filter: string) =>
  Object.keys(data).filter(key => {
    const value = String(data[key]).toLowerCase();
    return key.toLowerCase().includes(filter) || value.includes(filter);
  });

export const filterSections = (
  sections: SectionType[],
  item: Item,
  filteredValue?: string
) => {
  return sections
    .map(section => {
      const sectionData: Record<string, unknown> = get(item, section.key);
      let data = section.properties
        ? pick(sectionData, section.properties)
        : sectionData;

      if (!isEmpty(data)) {
        data = pathify(data, { maxDepth: 5, parentKey: section.key });
        if (filteredValue) {
          return {
            ...section,
            data: pick(data, filterData(data, filteredValue))
          };
        }
      }
      return { ...section, data };
    })
    .filter(({ required, data }) => {
      if (filteredValue && isEmpty(data)) {
        return false;
      }
      return required || !isEmpty(data);
    });
};
