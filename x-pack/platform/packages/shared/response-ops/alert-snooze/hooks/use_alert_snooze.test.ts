/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { Wrapper } from '@kbn/alerts-ui-shared/src/common/test_utils/wrapper';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { muteAlertInstance } from '@kbn/response-ops-alerts-apis/apis/mute_alert_instance';
import { snoozeAlertInstance } from '@kbn/response-ops-alerts-apis/apis/snooze_alert_instance';
import { unmuteAlertInstance } from '@kbn/response-ops-alerts-apis/apis/unmute_alert_instance';
import { unsnoozeAlertInstance } from '@kbn/response-ops-alerts-apis/apis/unsnooze_alert_instance';
import { useAlertSnooze } from './use_alert_snooze';

jest.mock('@kbn/response-ops-alerts-apis/apis/mute_alert_instance');
jest.mock('@kbn/response-ops-alerts-apis/apis/snooze_alert_instance');
jest.mock('@kbn/response-ops-alerts-apis/apis/unmute_alert_instance');
jest.mock('@kbn/response-ops-alerts-apis/apis/unsnooze_alert_instance');

const mockMute = muteAlertInstance as jest.MockedFunction<typeof muteAlertInstance>;
const mockSnooze = snoozeAlertInstance as jest.MockedFunction<typeof snoozeAlertInstance>;
const mockUnmute = unmuteAlertInstance as jest.MockedFunction<typeof unmuteAlertInstance>;
const mockUnsnooze = unsnoozeAlertInstance as jest.MockedFunction<typeof unsnoozeAlertInstance>;

const RULE_ID = 'rule-1';
const INSTANCE_ID = 'instance-1';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

const renderUseAlertSnooze = (overrides: Partial<Parameters<typeof useAlertSnooze>[0]> = {}) =>
  renderHook(
    () =>
      useAlertSnooze({
        http,
        notifications,
        ruleId: RULE_ID,
        instanceId: INSTANCE_ID,
        ...overrides,
      }),
    { wrapper: Wrapper }
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockMute.mockResolvedValue(undefined);
  mockSnooze.mockResolvedValue(undefined);
  mockUnmute.mockResolvedValue(undefined);
  mockUnsnooze.mockResolvedValue(undefined);
});

describe('useAlertSnooze', () => {
  describe('snoozeAlert', () => {
    it('mutes the instance for an indefinite snooze with no conditions', async () => {
      const onSuccess = jest.fn();
      const { result } = renderUseAlertSnooze({ onSuccess });

      let applied: boolean | undefined;
      await act(async () => {
        applied = await result.current.snoozeAlert({ expiresAt: null });
      });

      expect(applied).toBe(true);
      expect(mockMute).toHaveBeenCalledWith({ http, id: RULE_ID, instanceId: INSTANCE_ID });
      expect(mockSnooze).not.toHaveBeenCalled();
      expect(notifications.toasts.addSuccess).toHaveBeenCalledWith('Alert snoozed');
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('snoozes the instance for a time-based snooze', async () => {
      const { result } = renderUseAlertSnooze();

      let applied: boolean | undefined;
      await act(async () => {
        applied = await result.current.snoozeAlert({ expiresAt: '2026-06-01T00:00:00.000Z' });
      });

      expect(applied).toBe(true);
      expect(mockSnooze).toHaveBeenCalledWith(
        expect.objectContaining({
          http,
          id: RULE_ID,
          instanceId: INSTANCE_ID,
          expiresAt: '2026-06-01T00:00:00.000Z',
        })
      );
      expect(mockMute).not.toHaveBeenCalled();
    });

    it('snoozes with conditions and operator for a condition-based snooze', async () => {
      const { result } = renderUseAlertSnooze();
      const conditions = [{ type: 'severity_change' as const }];

      let applied: boolean | undefined;
      await act(async () => {
        applied = await result.current.snoozeAlert({
          expiresAt: null,
          conditions,
          conditionOperator: 'any',
        });
      });

      expect(applied).toBe(true);
      expect(mockSnooze).toHaveBeenCalledWith(
        expect.objectContaining({
          http,
          id: RULE_ID,
          instanceId: INSTANCE_ID,
          conditions,
          conditionOperator: 'any',
        })
      );
      expect(mockMute).not.toHaveBeenCalled();
    });

    it('does nothing and returns false when ids are missing', async () => {
      const { result } = renderUseAlertSnooze({ ruleId: undefined });

      let applied: boolean | undefined;
      await act(async () => {
        applied = await result.current.snoozeAlert({ expiresAt: null });
      });

      expect(applied).toBe(false);
      expect(mockMute).not.toHaveBeenCalled();
      expect(mockSnooze).not.toHaveBeenCalled();
    });

    it('returns false and does not call onSuccess when the API fails', async () => {
      const onSuccess = jest.fn();
      mockMute.mockRejectedValue({ body: { message: 'boom' } });
      const { result } = renderUseAlertSnooze({ onSuccess });

      let applied: boolean | undefined;
      await act(async () => {
        applied = await result.current.snoozeAlert({ expiresAt: null });
      });

      expect(applied).toBe(false);
      expect(notifications.toasts.addError).toHaveBeenCalled();
      expect(notifications.toasts.addSuccess).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('unsnoozeAlert', () => {
    it('unmutes when the instance is muted', async () => {
      const onSuccess = jest.fn();
      const { result } = renderUseAlertSnooze({ isMuted: true, onSuccess });

      let done: boolean | undefined;
      await act(async () => {
        done = await result.current.unsnoozeAlert();
      });

      expect(done).toBe(true);
      expect(mockUnmute).toHaveBeenCalledWith({ http, id: RULE_ID, instanceId: INSTANCE_ID });
      expect(mockUnsnooze).not.toHaveBeenCalled();
      expect(notifications.toasts.addSuccess).toHaveBeenCalledWith('Alert unsnoozed');
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('unsnoozes when the instance is snoozed', async () => {
      const { result } = renderUseAlertSnooze({ isSnoozed: true });

      let done: boolean | undefined;
      await act(async () => {
        done = await result.current.unsnoozeAlert();
      });

      expect(done).toBe(true);
      expect(mockUnsnooze).toHaveBeenCalledWith({ http, id: RULE_ID, instanceId: INSTANCE_ID });
      expect(mockUnmute).not.toHaveBeenCalled();
    });

    it('clears both when the instance is muted and snoozed', async () => {
      const { result } = renderUseAlertSnooze({ isMuted: true, isSnoozed: true });

      let done: boolean | undefined;
      await act(async () => {
        done = await result.current.unsnoozeAlert();
      });

      expect(done).toBe(true);
      expect(mockUnmute).toHaveBeenCalledTimes(1);
      expect(mockUnsnooze).toHaveBeenCalledTimes(1);
    });

    it('does nothing and returns false when ids are missing', async () => {
      const { result } = renderUseAlertSnooze({ instanceId: undefined, isMuted: true });

      let done: boolean | undefined;
      await act(async () => {
        done = await result.current.unsnoozeAlert();
      });

      expect(done).toBe(false);
      expect(mockUnmute).not.toHaveBeenCalled();
      expect(mockUnsnooze).not.toHaveBeenCalled();
    });

    it('returns false when the API fails', async () => {
      mockUnmute.mockRejectedValue({ body: { message: 'nope' } });
      const { result } = renderUseAlertSnooze({ isMuted: true });

      let done: boolean | undefined;
      await act(async () => {
        done = await result.current.unsnoozeAlert();
      });

      expect(done).toBe(false);
      expect(notifications.toasts.addError).toHaveBeenCalled();
      expect(notifications.toasts.addSuccess).not.toHaveBeenCalled();
    });
  });
});
