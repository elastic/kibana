/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addFilterStateIfNotThere, getDescriptionItem } from './';

import { esFilters, Filter } from '../../../../../../../../../../src/plugins/data/public';
import { mockAboutStepRule } from '../../all/__mocks__/mock';
import { FilterManager } from '../../../../../../../../../../src/plugins/data/public/query/filter_manager';
import { coreMock } from 'src/core/public/mocks';
import { DEFAULT_TIMELINE_TITLE } from '../../../../../components/timeline/search_super_select/translations';
import * as i18n from './translations';

import React from 'react';
const setupMock = coreMock.createSetup();
const uiSettingsMock = (pinnedByDefault: boolean) => (key: string) => {
  switch (key) {
    case 'filters:pinnedByDefault':
      return pinnedByDefault;
    default:
      throw new Error(`Unexpected uiSettings key in FilterManager mock: ${key}`);
  }
};
setupMock.uiSettings.get.mockImplementation(uiSettingsMock(true));

describe('description_step', () => {
  describe('addFilterStateIfNotThere', () => {
    test('it does not change the state if it is global', () => {
      const filters: Filter[] = [
        {
          $state: {
            store: esFilters.FilterStateStore.GLOBAL_STATE,
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
        {
          $state: {
            store: esFilters.FilterStateStore.GLOBAL_STATE,
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
      ];
      const output = addFilterStateIfNotThere(filters);
      const expected: Filter[] = [
        {
          $state: {
            store: esFilters.FilterStateStore.GLOBAL_STATE,
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
        {
          $state: {
            store: esFilters.FilterStateStore.GLOBAL_STATE,
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it adds the state if it does not exist as local', () => {
      const filters: Filter[] = [
        {
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
        {
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
      ];
      const output = addFilterStateIfNotThere(filters);
      const expected: Filter[] = [
        {
          $state: {
            store: esFilters.FilterStateStore.APP_STATE,
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
        {
          $state: {
            store: esFilters.FilterStateStore.APP_STATE,
          },
          meta: {
            alias: null,
            disabled: false,
            key: 'event.category',
            negate: false,
            params: {
              query: 'file',
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'event.category': 'file',
            },
          },
        },
      ];
      expect(output).toEqual(expected);
    });
  });

  describe('getDescriptionItem', () => {
    const mockFilterManager = new FilterManager(setupMock.uiSettings);
    test('returns ListItem with all values enumerated when value[field] is an array', () => {
      const result = getDescriptionItem('tags', 'Tags label', mockAboutStepRule, mockFilterManager);

      expect(result[0].title).toEqual('Tags label');
      expect(typeof result[0].description).toEqual('object');
    });

    test('returns ListItem with description of value[field] when value[field] is a string', () => {
      const result = getDescriptionItem(
        'description',
        'Description label',
        mockAboutStepRule,
        mockFilterManager
      );

      expect(result[0].title).toEqual('Description label');
      expect(result[0].description).toEqual('24/7');
    });

    test('returns empty array when `value` is a non-existant property in `field`', () => {
      const result = getDescriptionItem(
        'jibberjabber',
        'JibberJabber label',
        mockAboutStepRule,
        mockFilterManager
      );

      expect(result.length).toEqual(0);
    });

    describe('queryBar', () => {
      test('returns array of ListItems when queryBar exist', () => {
        const mockQueryBar = {
          isNew: false,
          queryBar: {
            query: {
              query: 'user.name: root or user.name: admin',
              language: 'kuery',
            },
            filters: null,
            saved_id: null,
          },
        };
        const result = getDescriptionItem(
          'queryBar',
          'Query bar label',
          mockQueryBar,
          mockFilterManager
        );

        expect(result[0].title).toEqual(<>{i18n.QUERY_LABEL} </>);
        expect(result[0].description).toEqual(<>{mockQueryBar.queryBar.query.query} </>);
      });
    });

    describe('threat', () => {
      test('returns array of ListItems when threat exist', () => {
        const result = getDescriptionItem(
          'threat',
          'Threat label',
          mockAboutStepRule,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Threat label');
        expect(typeof result[0].description).toEqual('object'); // TODO: figure out better way to test this
      });

      test('filters out threats with tactic.name of `none`', () => {
        const mockAboutStep = {
          ...mockAboutStepRule,
          threat: [
            {
              framework: 'mockFramework',
              tactic: {
                id: '1234',
                name: 'none',
                reference: 'reference1',
              },
              technique: [
                {
                  id: '456',
                  name: 'technique1',
                  reference: 'technique reference',
                },
              ],
            },
          ],
        };
        const result = getDescriptionItem(
          'threat',
          'Threat label',
          mockAboutStep,
          mockFilterManager
        );

        expect(result.length).toEqual(0);
      });
    });

    describe('references', () => {
      test('returns array of ListItems when references exist', () => {
        const result = getDescriptionItem(
          'references',
          'Reference label',
          mockAboutStepRule,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Reference label');
        expect(typeof result[0].description).toEqual('object'); // TODO: figure out better way to test this
      });
    });

    describe('falsePositives', () => {
      test('returns array of ListItems when falsePositives exist', () => {
        const result = getDescriptionItem(
          'falsePositives',
          'False positives label',
          mockAboutStepRule,
          mockFilterManager
        );

        expect(result[0].title).toEqual('False positives label');
        expect(typeof result[0].description).toEqual('object'); // TODO: figure out better way to test this
      });
    });

    describe('severity', () => {
      test('returns array of ListItems when severity exist', () => {
        const result = getDescriptionItem(
          'severity',
          'Severity label',
          mockAboutStepRule,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Severity label');
        expect(typeof result[0].description).toEqual('object'); // TODO: figure out better way to test this
      });
    });

    describe('riskScore', () => {
      test('returns array of ListItems when riskScore exist', () => {
        const result = getDescriptionItem(
          'riskScore',
          'Risk score label',
          mockAboutStepRule,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Risk score label');
        expect(result[0].description).toEqual(1);
      });
    });

    describe('timeline', () => {
      test('returns timeline title if one exists', () => {
        const result = getDescriptionItem(
          'timeline',
          'Timeline label',
          mockAboutStepRule,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Timeline label');
        expect(result[0].description).toEqual('Titled timeline');
      });

      test('returns default timeline title if none exists', () => {
        const mockAboutStep = {
          ...mockAboutStepRule,
          timeline: {
            id: '12345',
          },
        };
        const result = getDescriptionItem(
          'timeline',
          'Timeline label',
          mockAboutStep,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Timeline label');
        expect(result[0].description).toEqual(DEFAULT_TIMELINE_TITLE);
      });
    });

    describe('documentation', () => {
      test('returns default documentation description', () => {
        const result = getDescriptionItem(
          'documentation',
          'Documentation label',
          mockAboutStepRule,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Documentation label');
        expect(result[0].description).toEqual(i18n.DOCUMENTATION_PREVIEW_DESCRIPTION);
      });
    });
  });
});
