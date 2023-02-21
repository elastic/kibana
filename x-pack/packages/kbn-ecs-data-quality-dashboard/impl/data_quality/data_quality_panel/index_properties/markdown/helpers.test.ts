/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventCategory, sourceIpWithTextMapping } from '../../../mock/enriched_field_metadata';
import { SAME_FAMILY } from '../../same_family/translations';
import { getIncompatibleMappingsMarkdownTableRows, getSameFamilyBadge } from './helpers';

describe('helpers', () => {
  describe('getSameFamilyBadge', () => {
    test('it returns the expected badge text when the field is in the same family', () => {
      const inSameFamily = {
        ...eventCategory,
        isInSameFamily: true,
      };

      expect(getSameFamilyBadge(inSameFamily)).toEqual(`\`${SAME_FAMILY}\``);
    });

    test('it returns an empty string when the field is NOT the same family', () => {
      const notInSameFamily = {
        ...eventCategory,
        isInSameFamily: false,
      };

      expect(getSameFamilyBadge(notInSameFamily)).toEqual('');
    });
  });

  describe('getIncompatibleMappingsMarkdownTableRows', () => {
    test('it returns the expected table rows when the field is in the same family', () => {
      const eventCategoryWithWildcard = {
        ...eventCategory, // `event.category` is a `keyword` per the ECS spec
        indexFieldType: 'wildcard', // this index has a mapping of `wildcard` instead of `keyword`
        isInSameFamily: true, // `wildcard` and `keyword` are in the same family
      };

      expect(
        getIncompatibleMappingsMarkdownTableRows([
          eventCategoryWithWildcard,
          sourceIpWithTextMapping,
        ])
      ).toEqual(
        '| event.category | `keyword` | `wildcard` `same family` |\n| source.ip | `ip` | `text`  |'
      );
    });

    test('it returns the expected table rows when the field is NOT in the same family', () => {
      const eventCategoryWithWildcard = {
        ...eventCategory, // `event.category` is a `keyword` per the ECS spec
        indexFieldType: 'text', // this index has a mapping of `text` instead of `keyword`
        isInSameFamily: false, // `text` and `keyword` are NOT in the same family
      };

      expect(
        getIncompatibleMappingsMarkdownTableRows([
          eventCategoryWithWildcard,
          sourceIpWithTextMapping,
        ])
      ).toEqual('| event.category | `keyword` | `text`  |\n| source.ip | `ip` | `text`  |');
    });
  });
});
