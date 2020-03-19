/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NewRule } from '../../../../containers/detection_engine/rules';
import {
  DefineStepRuleJson,
  ScheduleStepRuleJson,
  AboutStepRuleJson,
  AboutStepRule,
  ScheduleStepRule,
  DefineStepRule,
} from '../types';
import {
  getTimeTypeValue,
  formatDefineStepData,
  formatScheduleStepData,
  formatAboutStepData,
  formatRule,
} from './helpers';
import {
  mockDefineStepRule,
  mockQueryBar,
  mockScheduleStepRule,
  mockAboutStepRule,
} from '../all/__mocks__/mock';

describe('helpers', () => {
  describe('getTimeTypeValue', () => {
    test('returns timeObj with value 0 if no time value found', () => {
      const result = getTimeTypeValue('m');

      expect(result).toEqual({ unit: 'm', value: 0 });
    });

    test('returns timeObj with unit set to empty string if no expected time type found', () => {
      const result = getTimeTypeValue('5l');

      expect(result).toEqual({ unit: '', value: 5 });
    });

    test('returns timeObj with unit of s and value 5 when time is 5s ', () => {
      const result = getTimeTypeValue('5s');

      expect(result).toEqual({ unit: 's', value: 5 });
    });

    test('returns timeObj with unit of m and value 5 when time is 5m ', () => {
      const result = getTimeTypeValue('5m');

      expect(result).toEqual({ unit: 'm', value: 5 });
    });

    test('returns timeObj with unit of h and value 5 when time is 5h ', () => {
      const result = getTimeTypeValue('5h');

      expect(result).toEqual({ unit: 'h', value: 5 });
    });

    test('returns timeObj with value of 5 when time is float like 5.6m ', () => {
      const result = getTimeTypeValue('5m');

      expect(result).toEqual({ unit: 'm', value: 5 });
    });

    test('returns timeObj with value of 0 and unit of "" if random string passed in', () => {
      const result = getTimeTypeValue('random');

      expect(result).toEqual({ unit: '', value: 0 });
    });
  });

  describe('formatDefineStepData', () => {
    let mockData: DefineStepRule;

    beforeEach(() => {
      mockData = mockDefineStepRule();
    });

    test('returns formatted object as DefineStepRuleJson', () => {
      const result: DefineStepRuleJson = formatDefineStepData(mockData);
      const expected = {
        language: 'kuery',
        filters: mockQueryBar.filters,
        query: 'test query',
        saved_id: 'test123',
        index: ['filebeat-'],
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with no saved_id if no savedId provided', () => {
      const mockStepData = {
        ...mockData,
        queryBar: {
          ...mockData.queryBar,
          saved_id: '',
        },
      };
      const result: DefineStepRuleJson = formatDefineStepData(mockStepData);
      const expected = {
        language: 'kuery',
        filters: mockQueryBar.filters,
        query: 'test query',
        index: ['filebeat-'],
      };

      expect(result).toEqual(expected);
    });
  });

  describe('formatScheduleStepData', () => {
    let mockData: ScheduleStepRule;

    beforeEach(() => {
      mockData = mockScheduleStepRule();
    });

    test('returns formatted object as ScheduleStepRuleJson', () => {
      const result: ScheduleStepRuleJson = formatScheduleStepData(mockData);
      const expected = {
        enabled: false,
        from: 'now-660s',
        to: 'now',
        interval: '5m',
        meta: {
          from: '6m',
        },
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with "to" as "now" if "to" not supplied', () => {
      const mockStepData = {
        ...mockData,
      };
      delete mockStepData.to;
      const result: ScheduleStepRuleJson = formatScheduleStepData(mockStepData);
      const expected = {
        enabled: false,
        from: 'now-660s',
        to: 'now',
        interval: '5m',
        meta: {
          from: '6m',
        },
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with "to" as "now" if "to" random string', () => {
      const mockStepData = {
        ...mockData,
        to: 'random',
      };
      const result: ScheduleStepRuleJson = formatScheduleStepData(mockStepData);
      const expected = {
        enabled: false,
        from: 'now-660s',
        to: 'now',
        interval: '5m',
        meta: {
          from: '6m',
        },
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object  if "from" random string', () => {
      const mockStepData = {
        ...mockData,
        from: 'random',
      };
      const result: ScheduleStepRuleJson = formatScheduleStepData(mockStepData);
      const expected = {
        enabled: false,
        from: 'now-300s',
        to: 'now',
        interval: '5m',
        meta: {
          from: 'random',
        },
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object  if "interval" random string', () => {
      const mockStepData = {
        ...mockData,
        interval: 'random',
      };
      const result: ScheduleStepRuleJson = formatScheduleStepData(mockStepData);
      const expected = {
        enabled: false,
        from: 'now-360s',
        to: 'now',
        interval: 'random',
        meta: {
          from: '6m',
        },
      };

      expect(result).toEqual(expected);
    });
  });

  describe('formatAboutStepData', () => {
    let mockData: AboutStepRule;

    beforeEach(() => {
      mockData = mockAboutStepRule();
    });

    test('returns formatted object as AboutStepRuleJson', () => {
      const result: AboutStepRuleJson = formatAboutStepData(mockData);
      const expected = {
        description: '24/7',
        false_positives: ['test'],
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        risk_score: 21,
        severity: 'low',
        tags: ['tag1', 'tag2'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
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
        timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        timeline_title: 'Titled timeline',
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with empty falsePositive and references filtered out', () => {
      const mockStepData = {
        ...mockData,
        falsePositives: ['', 'test', ''],
        references: ['www.test.co', ''],
      };
      const result: AboutStepRuleJson = formatAboutStepData(mockStepData);
      const expected = {
        description: '24/7',
        false_positives: ['test'],
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        risk_score: 21,
        severity: 'low',
        tags: ['tag1', 'tag2'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
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
        timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        timeline_title: 'Titled timeline',
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object without note if note is empty string', () => {
      const mockStepData = {
        ...mockData,
        note: '',
      };
      const result: AboutStepRuleJson = formatAboutStepData(mockStepData);
      const expected = {
        description: '24/7',
        false_positives: ['test'],
        name: 'Query with rule-id',
        references: ['www.test.co'],
        risk_score: 21,
        severity: 'low',
        tags: ['tag1', 'tag2'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
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
        timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        timeline_title: 'Titled timeline',
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object without timeline_id and timeline_title if timeline.id is null', () => {
      const mockStepData = {
        ...mockData,
      };
      delete mockStepData.timeline.id;
      const result: AboutStepRuleJson = formatAboutStepData(mockStepData);
      const expected = {
        description: '24/7',
        false_positives: ['test'],
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        risk_score: 21,
        severity: 'low',
        tags: ['tag1', 'tag2'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
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
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with timeline_id and timeline_title if timeline.id is "', () => {
      const mockStepData = {
        ...mockData,
        timeline: {
          ...mockData.timeline,
          id: '',
        },
      };
      const result: AboutStepRuleJson = formatAboutStepData(mockStepData);
      const expected = {
        description: '24/7',
        false_positives: ['test'],
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        risk_score: 21,
        severity: 'low',
        tags: ['tag1', 'tag2'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
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
        timeline_id: '',
        timeline_title: 'Titled timeline',
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object without timeline_id and timeline_title if timeline.title is null', () => {
      const mockStepData = {
        ...mockData,
        timeline: {
          ...mockData.timeline,
          id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        },
      };
      delete mockStepData.timeline.title;
      const result: AboutStepRuleJson = formatAboutStepData(mockStepData);
      const expected = {
        description: '24/7',
        false_positives: ['test'],
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        risk_score: 21,
        severity: 'low',
        tags: ['tag1', 'tag2'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
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
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with timeline_id and timeline_title if timeline.title is "', () => {
      const mockStepData = {
        ...mockData,
        timeline: {
          id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
          title: '',
        },
      };
      const result: AboutStepRuleJson = formatAboutStepData(mockStepData);
      const expected = {
        description: '24/7',
        false_positives: ['test'],
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        risk_score: 21,
        severity: 'low',
        tags: ['tag1', 'tag2'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: { id: '1234', name: 'tactic1', reference: 'reference1' },
            technique: [{ id: '456', name: 'technique1', reference: 'technique reference' }],
          },
        ],
        timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        timeline_title: '',
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with threats filtered out where tactic.name is "none"', () => {
      const mockStepData = {
        ...mockData,
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
      const result: AboutStepRuleJson = formatAboutStepData(mockStepData);
      const expected = {
        description: '24/7',
        false_positives: ['test'],
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        risk_score: 21,
        severity: 'low',
        tags: ['tag1', 'tag2'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: { id: '1234', name: 'tactic1', reference: 'reference1' },
            technique: [{ id: '456', name: 'technique1', reference: 'technique reference' }],
          },
        ],
        timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        timeline_title: 'Titled timeline',
      };

      expect(result).toEqual(expected);
    });
  });

  describe('formatRule', () => {
    let mockAbout: AboutStepRule;
    let mockDefine: DefineStepRule;
    let mockSchedule: ScheduleStepRule;

    beforeEach(() => {
      mockAbout = mockAboutStepRule();
      mockDefine = mockDefineStepRule();
      mockSchedule = mockScheduleStepRule();
    });

    test('returns NewRule with type of saved_query when saved_id exists', () => {
      const result: NewRule = formatRule(mockDefine, mockAbout, mockSchedule);

      expect(result.type).toEqual('saved_query');
    });

    test('returns NewRule with type of query when saved_id does not exist', () => {
      const mockDefineStepRuleWithoutSavedId = {
        ...mockDefine,
        queryBar: {
          ...mockDefine.queryBar,
          saved_id: '',
        },
      };
      const result: NewRule = formatRule(mockDefineStepRuleWithoutSavedId, mockAbout, mockSchedule);

      expect(result.type).toEqual('query');
    });

    test('returns NewRule with id set to ruleId if ruleId exists', () => {
      const result: NewRule = formatRule(mockDefine, mockAbout, mockSchedule, 'query-with-rule-id');

      expect(result.id).toEqual('query-with-rule-id');
    });

    test('returns NewRule without id if ruleId does not exist', () => {
      const result: NewRule = formatRule(mockDefine, mockAbout, mockSchedule);

      expect(result.id).toBeUndefined();
    });
  });
});
