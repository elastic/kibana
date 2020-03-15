/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetStepsData, GetStepsDataDetails, getStepsData, getStepsDataDetails } from './helpers';
import { mockRuleWithEverything, mockRule } from './all/__mocks__/mock';
import { esFilters } from '../../../../../../../../src/plugins/data/public';

describe('rule helpers', () => {
  describe('getStepsData', () => {
    test('returns object with about, define, and schedule step properties formatted', () => {
      const { defineRuleData, aboutRuleData, scheduleRuleData }: GetStepsData = getStepsData({
        rule: mockRuleWithEverything('test-id'),
      });
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

      expect(defineRuleData).toEqual(defineRuleStepData);
      expect(aboutRuleData).toEqual(aboutRuleStepData);
      expect(scheduleRuleData).toEqual(scheduleRuleStepData);
    });

    describe('defineStepRule', () => {
      test('returns with saved_id if value exists on rule', () => {
        const { defineRuleData }: GetStepsData = getStepsData({ rule: mockRule('test-id') });
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

        expect(defineRuleData).toEqual(expected);
      });

      test('returns with saved_id of null if value does not exist on rule', () => {
        const mockedRule = {
          ...mockRule('test-id'),
        };
        delete mockedRule.saved_id;
        const { defineRuleData }: GetStepsData = getStepsData({ rule: mockedRule });
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

        expect(defineRuleData).toEqual(expected);
      });
    });

    describe('aboutRuleData', () => {
      test('returns timeline id and title of null if they do not exist on rule', () => {
        const mockedRule = mockRuleWithEverything('test-id');
        delete mockedRule.timeline_id;
        delete mockedRule.timeline_title;
        const { aboutRuleData }: GetStepsData = getStepsData({ rule: mockedRule });

        expect(aboutRuleData?.timeline.id).toBeNull();
        expect(aboutRuleData?.timeline.title).toBeNull();
      });

      test('returns name, description, and note as empty string if detailsView is true', () => {
        const { aboutRuleData }: GetStepsData = getStepsData({
          rule: mockRuleWithEverything('test-id'),
          detailsView: true,
        });

        expect(aboutRuleData?.name).toEqual('');
        expect(aboutRuleData?.description).toEqual('');
        expect(aboutRuleData?.note).toEqual('');
      });

      test('returns note as empty string if property does not exist on rule', () => {
        const mockedRule = mockRuleWithEverything('test-id');
        delete mockedRule.note;
        const { aboutRuleData }: GetStepsData = getStepsData({
          rule: mockedRule,
        });

        expect(aboutRuleData?.note).toEqual('');
      });
    });

    describe('scheduleRuleData', () => {
      test('returns from as seconds if from duration is less than a minute', () => {
        const mockedRule = {
          ...mockRule('test-id'),
          from: 'now-62s',
          interval: '1m',
        };
        const { scheduleRuleData }: GetStepsData = getStepsData({ rule: mockedRule });

        expect(scheduleRuleData?.from).toEqual('2s');
        expect(scheduleRuleData?.interval).toEqual('1m');
      });

      test('returns from as minutes if from duration is less than an hour', () => {
        const mockedRule = {
          ...mockRule('test-id'),
          from: 'now-660s',
        };
        const { scheduleRuleData }: GetStepsData = getStepsData({ rule: mockedRule });

        expect(scheduleRuleData?.from).toEqual('6m');
        expect(scheduleRuleData?.interval).toEqual('5m');
      });

      test('returns from as hours if from duration is more than 60 minutes', () => {
        const mockedRule = {
          ...mockRule('test-id'),
          from: 'now-7400s',
          interval: '5m',
        };
        const { scheduleRuleData }: GetStepsData = getStepsData({ rule: mockedRule });

        expect(scheduleRuleData?.from).toEqual('1h');
        expect(scheduleRuleData?.interval).toEqual('5m');
      });

      test('returns from as if from is not parsable as dateMath', () => {
        const mockedRule = {
          ...mockRule('test-id'),
          from: 'randomstring',
        };
        const { scheduleRuleData }: GetStepsData = getStepsData({ rule: mockedRule });

        expect(scheduleRuleData?.from).toEqual('NaNh');
      });

      test('returns from as 5m if interval is not parsable as dateMath', () => {
        const mockedRule = {
          ...mockRule('test-id'),
          interval: 'randomstring',
        };
        const { scheduleRuleData }: GetStepsData = getStepsData({ rule: mockedRule });

        expect(scheduleRuleData?.from).toEqual('5m');
        expect(scheduleRuleData?.interval).toEqual('randomstring');
      });
    });
  });

  describe('getStepsDataDetails', () => {
    test('returns object with about, about details, define, and schedule step properties formatted', () => {
      const {
        defineRuleData,
        aboutRuleData,
        aboutRuleDataDetails,
        scheduleRuleData,
      }: GetStepsDataDetails = getStepsDataDetails(mockRuleWithEverything('test-id'));
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
        description: '',
        falsePositives: ['test'],
        isNew: false,
        name: '',
        note: '',
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
      const aboutRuleDataDetailsData = {
        note: '# this is some markdown documentation',
        description: '24/7',
      };
      const scheduleRuleStepData = { enabled: true, from: '0s', interval: '5m', isNew: false };

      expect(defineRuleData).toEqual(defineRuleStepData);
      expect(aboutRuleData).toEqual(aboutRuleStepData);
      expect(aboutRuleDataDetails).toEqual(aboutRuleDataDetailsData);
      expect(scheduleRuleData).toEqual(scheduleRuleStepData);
    });

    test('returns aboutRuleDataDetails with empty string if "note" does not exist', () => {
      const { note, ...mockRuleWithoutNote } = { ...mockRuleWithEverything('test-id') };
      const { aboutRuleDataDetails }: GetStepsDataDetails = getStepsDataDetails(
        mockRuleWithoutNote
      );

      const aboutRuleDetailsData = { note: '', description: mockRuleWithoutNote.description };

      expect(aboutRuleDataDetails).toEqual(aboutRuleDetailsData);
    });
  });
});
