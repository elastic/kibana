/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetStepsData, getStepsData } from './helpers';
import { mockRuleWithEverything, mockRule } from './all/__mocks__/mock';
import { esFilters } from '../../../../../../../../src/plugins/data/public';

describe('rule helpers', () => {
  describe('getStepsData', () => {
    test('returns object with about, define, and schedule step properties formatted', () => {
      const result = getStepsData({ rule: mockRuleWithEverything('test-id') });
      const defineRuleStepData = {
        isNew: false,
        index: ['auditbeat-*'],
        queryBar: {
          query: {
            query: 'user.name: root or user.name: admin',
            language: 'kuery',
          },
          filters: [
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
          ],
          saved_id: 'test123',
        },
      };
      const aboutRuleStepData = {
        description: '24/7',
        falsePositives: ['test'],
        isNew: false,
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        riskScore: 21,
        severity: 'low',
        tags: ['tag1', 'tag2'],
        threat: [
          {
            framework: 'mockFramework',
            tactic: {
              id: '1234',
              name: 'tactic1',
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
        timeline: {
          id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
          title: 'Titled timeline',
        },
      };
      const scheduleRuleStepData = { enabled: true, from: '0s', interval: '5m', isNew: false };

      expect(result.defineRuleData).toEqual(defineRuleStepData);
      expect(result.aboutRuleData).toEqual(aboutRuleStepData);
      expect(result.scheduleRuleData).toEqual(scheduleRuleStepData);
    });

    describe('defineStepRule', () => {
      test('returns with saved_id if value exists on rule', () => {
        const result: GetStepsData = getStepsData({ rule: mockRule('test-id') });
        const expected = {
          isNew: false,
          index: ['auditbeat-*'],
          queryBar: {
            query: {
              query: '',
              language: 'kuery',
            },
            filters: [],
            saved_id: "Garrett's IP",
          },
        };

        expect(result.defineRuleData).toEqual(expected);
      });

      test('returns with saved_id of null if value does not exist on rule', () => {
        const mockedRule = {
          ...mockRule('test-id'),
        };
        delete mockedRule.saved_id;
        const result: GetStepsData = getStepsData({ rule: mockedRule });
        const expected = {
          isNew: false,
          index: ['auditbeat-*'],
          queryBar: {
            query: {
              query: '',
              language: 'kuery',
            },
            filters: [],
            saved_id: null,
          },
        };

        expect(result.defineRuleData).toEqual(expected);
      });
    });

    describe('aboutRuleData', () => {
      test('returns timeline id and title of null if they do not exist on rule', () => {
        const mockedRule = mockRuleWithEverything('test-id');
        delete mockedRule.timeline_id;
        delete mockedRule.timeline_title;
        const result: GetStepsData = getStepsData({ rule: mockedRule });

        expect(result.aboutRuleData?.timeline.id).toBeNull();
        expect(result.aboutRuleData?.timeline.title).toBeNull();
      });

      test('returns name as empty string if detailsView is true', () => {
        const result: GetStepsData = getStepsData({
          rule: mockRuleWithEverything('test-id'),
          detailsView: true,
        });

        expect(result.aboutRuleData?.name).toEqual('');
      });

      test('returns note as empty string if property does not exist on rule', () => {
        const mockedRule = mockRuleWithEverything('test-id');
        delete mockedRule.note;
        const result: GetStepsData = getStepsData({
          rule: mockedRule,
          detailsView: true,
        });

        expect(result.aboutRuleData?.note).toEqual('');
      });
    });

    describe('scheduleRuleData', () => {
      test('returns from as seconds if from duration is less than a minute', () => {
        const mockedRule = {
          ...mockRule('test-id'),
          from: 'now-62s',
          interval: '1m',
        };
        const result = getStepsData({ rule: mockedRule });

        expect(result.scheduleRuleData?.from).toEqual('2s');
        expect(result.scheduleRuleData?.interval).toEqual('1m');
      });

      test('returns from as minutes if from duration is less than an hour', () => {
        const mockedRule = {
          ...mockRule('test-id'),
          from: 'now-660s',
        };
        const result = getStepsData({ rule: mockedRule });

        expect(result.scheduleRuleData?.from).toEqual('6m');
        expect(result.scheduleRuleData?.interval).toEqual('5m');
      });

      test('returns from as hours if from duration is more than 60 minutes', () => {
        const mockedRule = {
          ...mockRule('test-id'),
          from: 'now-7400s',
          interval: '5m',
        };
        const result = getStepsData({ rule: mockedRule });

        expect(result.scheduleRuleData?.from).toEqual('1h');
        expect(result.scheduleRuleData?.interval).toEqual('5m');
      });

      // Note: is this desired behavior?
      test('returns from as if from is not parsable as dateMath', () => {
        const mockedRule = {
          ...mockRule('test-id'),
          from: 'randomstring',
        };
        const result = getStepsData({ rule: mockedRule });

        expect(result.scheduleRuleData?.from).toEqual('NaNh');
      });

      test('returns from as 5m if interval is not parsable as dateMath', () => {
        const mockedRule = {
          ...mockRule('test-id'),
          interval: 'randomstring',
        };
        const result = getStepsData({ rule: mockedRule });

        expect(result.scheduleRuleData?.from).toEqual('5m');
        expect(result.scheduleRuleData?.interval).toEqual('randomstring');
      });
    });
  });
});
