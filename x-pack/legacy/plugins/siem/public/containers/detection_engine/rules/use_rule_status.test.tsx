/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act, cleanup } from '@testing-library/react-hooks';
import {
  useRuleStatus,
  ReturnRuleStatus,
  useRulesStatuses,
  ReturnRulesStatuses,
} from './use_rule_status';
import * as api from './api';

jest.mock('./api');

const testRule = {
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
};

describe('useRuleStatus', () => {
  // beforeEach(() => {
  //   jest.resetAllMocks();
  //   jest.restoreAllMocks();
  //   jest.clearAllMocks();
  // });
  // afterEach(async () => {
  //   cleanup();
  // });

  // test('init', async () => {
  //   await act(async () => {
  //     const { result, waitForNextUpdate } = renderHook<string, ReturnRulesStatuses>(() =>
  //       useRulesStatuses([testRule])
  //     );
  //     await waitForNextUpdate();
  //     expect(result.current).toEqual([true, null, null]);
  //   });
  // });

  // GOOD TEST
  test('init status', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnRulesStatuses>(() =>
        useRulesStatuses([testRule])
      );
      await waitForNextUpdate();
      // expect(result.current).toEqual({ loading: true, rulesStatuses: null });
      expect(result.current).toEqual([true, null, null]);
    });
  });

  // test('fetch rule status', async () => {
  //   await act(async () => {
  //     const { result, waitForNextUpdate } = renderHook<string, ReturnRuleStatus>(() =>
  //       useRuleStatus('myOwnRuleID')
  //     );
  //     await waitForNextUpdate();
  //     await waitForNextUpdate();
  //     expect(result.current).toEqual([
  //       false,
  //       {
  //         current_status: {
  //           alert_id: 'alertId',
  //           last_failure_at: null,
  //           last_failure_message: null,
  //           last_success_at: 'mm/dd/yyyyTHH:MM:sssz',
  //           last_success_message: 'it is a success',
  //           status: 'succeeded',
  //           status_date: 'mm/dd/yyyyTHH:MM:sssz',
  //         },
  //         failures: [],
  //       },
  //       result.current[2],
  //     ]);
  //   });
  // });

  // test('re-fetch rule status', async () => {
  //   const spyOngetRuleStatusById = jest.spyOn(api, 'getRuleStatusById');
  //   await act(async () => {
  //     const { result, waitForNextUpdate } = renderHook<string, ReturnRuleStatus>(() =>
  //       useRuleStatus('myOwnRuleID')
  //     );
  //     await waitForNextUpdate();
  //     await waitForNextUpdate();
  //     if (result.current[2]) {
  //       result.current[2]('myOwnRuleID');
  //     }
  //     await waitForNextUpdate();
  //     expect(spyOngetRuleStatusById).toHaveBeenCalledTimes(2);
  //   });
  // });

  // test('fetch rule status', async () => {
  //   act(async () => {
  //     const { result, waitForNextUpdate } = renderHook<string, ReturnRulesStatuses>(() =>
  //       useRulesStatuses([testRule])
  //     );
  //     await waitForNextUpdate();
  //     await waitForNextUpdate();
  //     expect(result.current).toEqual({
  //       loading: false,
  //       '12345678987654321': {
  //         current_status: {
  //           alert_id: 'alertId',
  //           last_failure_at: null,
  //           last_failure_message: null,
  //           last_success_at: 'mm/dd/yyyyTHH:MM:sssz',
  //           last_success_message: 'it is a success',
  //           status: 'succeeded',
  //           status_date: 'mm/dd/yyyyTHH:MM:sssz',
  //         },
  //         failures: [],
  //       },
  //     });
  //   });
  // });

  // test('re-fetch rule status', async () => {
  //   const spyOngetRuleStatusById = jest.spyOn(api, 'getRulesStatusByIds');
  //   await act(async () => {
  //     const { result, waitForNextUpdate } = renderHook<string, ReturnRulesStatuses>(() =>
  //     useRulesStatuses([testRule]);
  //     );
  //     // await waitForNextUpdate();
  //     // await waitForNextUpdate();
  //     if (result.current[2]) {
  //       result.current[2]('myOwnRuleID');
  //     }
  //     await waitForNextUpdate();
  //     expect(spyOngetRuleStatusById).toHaveBeenCalledTimes(2);
  //   });
  // });
});
