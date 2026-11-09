/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { RuleExecutionView } from '@kbn/alerting-v2-schemas';
import { buildRuleDiagnosisContext } from './build_rule_diagnosis_handoff';
import { DIAGNOSE_PENDING_HANDOFF_STORAGE_KEY } from './diagnose_pending_handoff';
import { useDiagnoseAvailability } from './use_diagnose_availability';

const mockOpenChat = jest.fn();
jest.mock('./open_rule_failure_diagnosis_chat', () => ({
  openRuleFailureDiagnosisChat: (params: unknown) => mockOpenChat(params),
  diagnoseHandoffErrorToastTitle: () => 'Unable to start AI diagnosis',
}));

let mockServices: Record<string, unknown> = {};
jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => `plugin:${key}`,
}));
jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: (token: string) => mockServices[token],
}));

const execution: RuleExecutionView = {
  id: 'exec-1',
  rule: { id: 'rule-1' },
  started_at: '2026-11-09T16:00:00.000Z',
  ended_at: '2026-11-09T16:00:01.000Z',
  timings: { duration_ms: 1000, scheduled_delay_ms: 0 },
  outcome: 'failure',
  error: { message: 'Unknown column [x]' },
};
const context = buildRuleDiagnosisContext({ execution, ruleName: 'My rule' });

interface SetupOptions {
  agentBuilder?: boolean;
  showCapability?: boolean;
  access?: { hasRequiredLicense: boolean; hasLlmConnector: boolean } | Error;
  liveConnectors?: unknown[];
}

const setup = ({
  agentBuilder = true,
  showCapability = true,
  access = { hasRequiredLicense: true, hasLlmConnector: true },
  liveConnectors = [],
}: SetupOptions = {}) => {
  const getAgentBuilderAccess = jest.fn(() =>
    access instanceof Error ? Promise.reject(access) : Promise.resolve(access)
  );
  const http = { get: jest.fn().mockResolvedValue({ connectors: liveConnectors }) };
  const application = {
    capabilities: { agentBuilder: { show: showCapability } },
    navigateToApp: jest.fn(),
    getUrlForApp: jest.fn(() => '/app/management/stack/license_management'),
  };
  const notifications = { toasts: { addError: jest.fn() } };

  mockServices = {
    'plugin:agentBuilder': agentBuilder ? { getAgentBuilderAccess } : undefined,
    application,
    http,
    notifications,
  };

  return { getAgentBuilderAccess, http, application, notifications };
};

describe('useDiagnoseAvailability', () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockOpenChat.mockReset();
    sessionStorage.clear();
  });

  it('is state A with a license and an LLM connector', async () => {
    setup();
    const { result } = renderHook(() => useDiagnoseAvailability());

    await waitFor(() => expect(result.current.state).toBe('a'));
    expect(result.current.requiredLicenseTier).toBe('enterprise');
  });

  it('is state B without an LLM connector, and a live connector probe upgrades it to A', async () => {
    setup({
      access: { hasRequiredLicense: true, hasLlmConnector: false },
      liveConnectors: [{ id: 'c1' }],
    });
    const { result } = renderHook(() => useDiagnoseAvailability());

    // Agent Builder's cached access says "no connector", the live probe says there is one.
    await waitFor(() => expect(result.current.state).toBe('a'));
  });

  it('is state B when neither the cached nor the live probe sees a connector', async () => {
    setup({ access: { hasRequiredLicense: true, hasLlmConnector: false } });
    const { result } = renderHook(() => useDiagnoseAvailability());

    await waitFor(() => expect(result.current.state).toBe('b'));
  });

  it('is state C without the required license', async () => {
    setup({ access: { hasRequiredLicense: false, hasLlmConnector: true } });
    const { result } = renderHook(() => useDiagnoseAvailability());

    await waitFor(() => expect(result.current.state).toBe('c'));
  });

  it.each<[string, SetupOptions]>([
    ['Agent Builder is not installed', { agentBuilder: false }],
    ['the user lacks the show capability', { showCapability: false }],
    ['access detection fails', { access: new Error('boom') }],
  ])('is state D when %s', async (_, options) => {
    setup(options);
    const { result } = renderHook(() => useDiagnoseAvailability());

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.state).toBe('d');
  });

  describe('openDiagnose', () => {
    it('opens the chat with the context and does not store a pending handoff in state A', async () => {
      const { http } = setup();
      const { result } = renderHook(() => useDiagnoseAvailability());
      await waitFor(() => expect(result.current.state).toBe('a'));

      act(() => result.current.openDiagnose(context));

      expect(mockOpenChat).toHaveBeenCalledWith(
        expect.objectContaining({ context, http, agentBuilder: expect.any(Object) })
      );
      expect(sessionStorage.getItem(DIAGNOSE_PENDING_HANDOFF_STORAGE_KEY)).toBeNull();
    });

    it('ignores a second call while a handoff is in flight', async () => {
      setup();
      const { result } = renderHook(() => useDiagnoseAvailability());
      await waitFor(() => expect(result.current.state).toBe('a'));

      act(() => {
        result.current.openDiagnose(context);
        result.current.openDiagnose(context);
      });

      expect(mockOpenChat).toHaveBeenCalledTimes(1);
      expect(result.current.isHandoffInFlight).toBe(true);
      await waitFor(() => expect(result.current.isHandoffInFlight).toBe(false));
    });

    it('toasts and releases the in-flight guard when opening the chat throws', async () => {
      const { notifications } = setup();
      mockOpenChat.mockImplementation(() => {
        throw new Error('openChat failed');
      });
      const { result } = renderHook(() => useDiagnoseAvailability());
      await waitFor(() => expect(result.current.state).toBe('a'));

      act(() => result.current.openDiagnose(context));

      expect(notifications.toasts.addError).toHaveBeenCalledWith(expect.any(Error), {
        title: 'Unable to start AI diagnosis',
      });
      expect(result.current.isHandoffInFlight).toBe(false);
    });

    it('does nothing when Agent Builder is not available', async () => {
      setup({ agentBuilder: false });
      const { result } = renderHook(() => useDiagnoseAvailability());

      act(() => result.current.openDiagnose(context));

      expect(mockOpenChat).not.toHaveBeenCalled();
    });
  });

  describe('state B pending handoff', () => {
    it('stores the context and resumes it once an LLM connector appears on window focus', async () => {
      const { http } = setup({ access: { hasRequiredLicense: true, hasLlmConnector: false } });
      const { result } = renderHook(() => useDiagnoseAvailability());
      await waitFor(() => expect(result.current.state).toBe('b'));

      act(() => result.current.openDiagnose(context));
      expect(JSON.parse(sessionStorage.getItem(DIAGNOSE_PENDING_HANDOFF_STORAGE_KEY)!)).toEqual({
        context: JSON.parse(JSON.stringify(context)),
      });
      mockOpenChat.mockClear();
      await waitFor(() => expect(result.current.isHandoffInFlight).toBe(false));

      // The user finishes connector setup elsewhere and returns to the tab.
      http.get.mockResolvedValue({ connectors: [{ id: 'new-connector' }] });
      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });

      await waitFor(() => expect(mockOpenChat).toHaveBeenCalledTimes(1));
      expect(mockOpenChat).toHaveBeenCalledWith(expect.objectContaining({ context }));
      expect(sessionStorage.getItem(DIAGNOSE_PENDING_HANDOFF_STORAGE_KEY)).toBeNull();
    });

    it('keeps the pending handoff while there is still no LLM connector', async () => {
      setup({ access: { hasRequiredLicense: true, hasLlmConnector: false } });
      const { result } = renderHook(() => useDiagnoseAvailability());
      await waitFor(() => expect(result.current.state).toBe('b'));

      act(() => result.current.openDiagnose(context));
      mockOpenChat.mockClear();
      await waitFor(() => expect(result.current.isHandoffInFlight).toBe(false));

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });

      expect(mockOpenChat).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(DIAGNOSE_PENDING_HANDOFF_STORAGE_KEY)).not.toBeNull();
    });
  });

  it('navigates to license management', async () => {
    const { application } = setup({ access: { hasRequiredLicense: false, hasLlmConnector: true } });
    const { result } = renderHook(() => useDiagnoseAvailability());
    await waitFor(() => expect(result.current.state).toBe('c'));

    act(() => result.current.openLicenseManagement());

    expect(application.navigateToApp).toHaveBeenCalledWith('management', {
      deepLinkId: 'license_management',
    });
  });

  it('exposes the license management URL for the license link', async () => {
    const { application } = setup({ access: { hasRequiredLicense: false, hasLlmConnector: true } });
    const { result } = renderHook(() => useDiagnoseAvailability());
    await waitFor(() => expect(result.current.state).toBe('c'));

    expect(application.getUrlForApp).toHaveBeenCalledWith('management', {
      deepLinkId: 'license_management',
    });
    expect(result.current.licenseManagementHref).toBe('/app/management/stack/license_management');
  });
});
