/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { shallow } from 'enzyme';

import {
  StepRuleDescriptionComponent,
  addFilterStateIfNotThere,
  buildListItems,
  getDescriptionItem,
} from './';

import {
  esFilters,
  Filter,
  FilterManager,
} from '../../../../../../../../../../src/plugins/data/public';
import { mockAboutStepRule } from '../../all/__mocks__/mock';
import { coreMock } from '../../../../../../../../../../src/core/public/mocks';
import { DEFAULT_TIMELINE_TITLE } from '../../../../../components/timeline/search_super_select/translations';
import * as i18n from './translations';

import { schema } from '../step_about_rule/schema';
import { ListItems } from './types';

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
const mockFilterManager = new FilterManager(setupMock.uiSettings);

jest.mock('react', () => {
  const r = jest.requireActual('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...r, memo: (x: any) => x };
});

describe('description_step', () => {
  describe('StepRuleDescriptionComponent', () => {
    test('renders correctly against snapshot when direction is `row`', () => {
      const wrapper = shallow(
        <StepRuleDescriptionComponent direction="row" data={mockAboutStepRule} schema={schema} />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('renders 2 columns when direction is `row`', () => {
      const wrapper = shallow(
        <StepRuleDescriptionComponent direction="row" data={mockAboutStepRule} schema={schema} />
      );
      expect(wrapper.find('[data-test-subj="listItemColumnStepRuleDescription"]')).toHaveLength(2);
    });

    test('renders correctly against snapshot when direction is NOT `row`', () => {
      const wrapper = shallow(
        <StepRuleDescriptionComponent direction="column" data={mockAboutStepRule} schema={schema} />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('renders 1 column when direction is NOT `row`', () => {
      const wrapper = shallow(
        <StepRuleDescriptionComponent direction="column" data={mockAboutStepRule} schema={schema} />
      );
      expect(wrapper.find('[data-test-subj="listItemColumnStepRuleDescription"]')).toHaveLength(1);
    });
  });

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

  describe('buildListItems', () => {
    test('returns expected ListItems array when given valid inputs', () => {
      const result: ListItems[] = buildListItems(mockAboutStepRule, schema, mockFilterManager);

      expect(result.length).toEqual(10);
    });
  });

  describe('getDescriptionItem', () => {
    test('returns ListItem with all values enumerated when value[field] is an array', () => {
      const result: ListItems[] = getDescriptionItem(
        'tags',
        'Tags label',
        mockAboutStepRule,
        mockFilterManager
      );

      expect(result[0].title).toEqual('Tags label');
      expect(typeof result[0].description).toEqual('object');
    });

    test('returns ListItem with description of value[field] when value[field] is a string', () => {
      const result: ListItems[] = getDescriptionItem(
        'description',
        'Description label',
        mockAboutStepRule,
        mockFilterManager
      );

      expect(result[0].title).toEqual('Description label');
      expect(result[0].description).toEqual('24/7');
    });

    test('returns empty array when `value` is a non-existant property in `field`', () => {
      const result: ListItems[] = getDescriptionItem(
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
        const result: ListItems[] = getDescriptionItem(
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
        const result: ListItems[] = getDescriptionItem(
          'threat',
          'Threat label',
          mockAboutStepRule,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Threat label');
        expect(React.isValidElement(result[0].description)).toBeTruthy();
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
        const result: ListItems[] = getDescriptionItem(
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
        const result: ListItems[] = getDescriptionItem(
          'references',
          'Reference label',
          mockAboutStepRule,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Reference label');
        expect(React.isValidElement(result[0].description)).toBeTruthy();
      });
    });

    describe('falsePositives', () => {
      test('returns array of ListItems when falsePositives exist', () => {
        const result: ListItems[] = getDescriptionItem(
          'falsePositives',
          'False positives label',
          mockAboutStepRule,
          mockFilterManager
        );

        expect(result[0].title).toEqual('False positives label');
        expect(React.isValidElement(result[0].description)).toBeTruthy();
      });
    });

    describe('severity', () => {
      test('returns array of ListItems when severity exist', () => {
        const result: ListItems[] = getDescriptionItem(
          'severity',
          'Severity label',
          mockAboutStepRule,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Severity label');
        expect(React.isValidElement(result[0].description)).toBeTruthy();
      });
    });

    describe('riskScore', () => {
      test('returns array of ListItems when riskScore exist', () => {
        const result: ListItems[] = getDescriptionItem(
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
        const result: ListItems[] = getDescriptionItem(
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
        const result: ListItems[] = getDescriptionItem(
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
        const result: ListItems[] = getDescriptionItem(
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
