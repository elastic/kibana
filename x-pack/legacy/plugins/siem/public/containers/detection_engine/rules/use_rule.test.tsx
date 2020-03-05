/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useRule, ReturnRule } from './use_rule';
import * as api from './api';

jest.mock('./api');

describe('useRule', () => {
  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnRule>(() =>
        useRule('myOwnRuleID')
      );
      await waitForNextUpdate();
      expect(result.current).toEqual([true, null]);
    });
  });

  test('fetch rule', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnRule>(() =>
        useRule('myOwnRuleID')
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual([
        false,
        {
          created_at: 'mm/dd/yyyyTHH:MM:sssz',
          created_by: 'mockUser',
          description: 'some desc',
          enabled: true,
          false_positives: [],
          filters: [],
          from: 'now-360s',
          id: '12345678987654321',
          immutable: false,
          index: [
            'apm-*-transaction*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'packetbeat-*',
            'winlogbeat-*',
          ],
          interval: '5m',
          language: 'kuery',
          name: 'Test rule',
          max_signals: 100,
          query: "user.email: 'root@elastic.co'",
          references: [],
          risk_score: 75,
          rule_id: 'bbd3106e-b4b5-4d7c-a1a2-47531d6a2baf',
          severity: 'high',
          tags: ['APM'],
          threat: [],
          to: 'now',
          type: 'query',
          updated_at: 'mm/dd/yyyyTHH:MM:sssz',
          updated_by: 'mockUser',
        },
      ]);
    });
  });

  test('fetch a new rule', async () => {
    const spyOnfetchRuleById = jest.spyOn(api, 'fetchRuleById');
    await act(async () => {
      const { rerender, waitForNextUpdate } = renderHook<string, ReturnRule>(id => useRule(id), {
        initialProps: 'myOwnRuleID',
      });
      await waitForNextUpdate();
      await waitForNextUpdate();
      rerender('newRuleId');
      await waitForNextUpdate();
      expect(spyOnfetchRuleById).toHaveBeenCalledTimes(2);
    });
  });
});
