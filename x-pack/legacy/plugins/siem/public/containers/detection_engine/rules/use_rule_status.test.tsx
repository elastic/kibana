/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useRuleStatus, ReturnRuleStatus } from './use_rule_status';
import * as api from './api';

jest.mock('./api');

describe('useRuleStatus', () => {
  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnRuleStatus>(() =>
        useRuleStatus('myOwnRuleID')
      );
      await waitForNextUpdate();
      expect(result.current).toEqual([true, null, null]);
    });
  });

  test('fetch rule status', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnRuleStatus>(() =>
        useRuleStatus('myOwnRuleID')
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual([
        false,
        {
          current_status: {
            alert_id: 'alertId',
            last_failure_at: null,
            last_failure_message: null,
            last_success_at: 'mm/dd/yyyyTHH:MM:sssz',
            last_success_message: 'it is a success',
            status: 'succeeded',
            status_date: 'mm/dd/yyyyTHH:MM:sssz',
          },
          failures: [],
        },
        result.current[2],
      ]);
    });
  });

  test('re-fetch rule status', async () => {
    const spyOngetRuleStatusById = jest.spyOn(api, 'getRuleStatusById');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnRuleStatus>(() =>
        useRuleStatus('myOwnRuleID')
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      if (result.current[2]) {
        result.current[2]('myOwnRuleID');
      }
      await waitForNextUpdate();
      expect(spyOngetRuleStatusById).toHaveBeenCalledTimes(2);
    });
  });
});
