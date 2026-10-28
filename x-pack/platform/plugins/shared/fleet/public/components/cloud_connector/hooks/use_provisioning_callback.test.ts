/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';

import {
  sendCreateProvisioningCallback,
  sendDeleteProvisioningCallback,
  sendGetProvisioningCallback,
  useGetProvisioningCallbackAvailabilityQuery,
} from '../../../hooks/use_request/provisioning_callback';
import type { CloudConnectorCallback } from '../../../../common/types/models/provisioning_callback';
import type { GetProvisioningCallbackAvailabilityResponse } from '../../../../common/types/rest_spec/provisioning_callback';

import {
  PROVISIONING_CALLBACK_POLL_INTERVAL_MS,
  PROVISIONING_CALLBACK_RECEIVING_GRACE_MS,
  useProvisioningCallback,
} from './use_provisioning_callback';

jest.mock('../../../hooks/use_request/provisioning_callback');

const mockedAvailabilityQuery = jest.mocked(useGetProvisioningCallbackAvailabilityQuery);
const mockedCreate = jest.mocked(sendCreateProvisioningCallback);
const mockedGet = jest.mocked(sendGetProvisioningCallback);
const mockedDelete = jest.mocked(sendDeleteProvisioningCallback);

const NOW = new Date('2026-10-13T10:00:00.000Z');
const EXPIRES_AT = '2026-10-13T12:00:00.000Z';

const pendingItem = (
  id = 'cb-1',
  overrides: Partial<CloudConnectorCallback> = {}
): CloudConnectorCallback => ({
  id,
  provider: 'aws',
  status: 'pending',
  created_at: NOW.toISOString(),
  expires_at: EXPIRES_AT,
  ...overrides,
});

const RECEIVED_VALUES = {
  role_arn: 'arn:aws:iam::123456789012:role/ElasticWorkloadIdentity-abc',
  stack_arn: 'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic/uuid-1',
};

const mockedRecheck = jest.fn();
/** What the server says about the callback; `undefined` while it is still checking. */
const setAvailability = (data: GetProvisioningCallbackAvailabilityResponse | undefined) =>
  mockedAvailabilityQuery.mockReturnValue({
    data,
    isLoading: data === undefined,
    refetch: mockedRecheck,
  } as any);
const NOT_HTTPS_REASON =
  'The public Kibana URL http://kb.example.com is not https. CloudFormation only accepts an https callback URL.';

const poll = async () => {
  await act(async () => {
    jest.advanceTimersByTime(PROVISIONING_CALLBACK_POLL_INTERVAL_MS);
  });
};

describe('useProvisioningCallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    setAvailability({ available: true, kibana_url: 'https://kb.example.com' });
    mockedCreate.mockResolvedValue({
      data: { item: pendingItem(), token: 'tok-1' },
      error: null,
    } as any);
    mockedGet.mockResolvedValue({ data: { item: pendingItem() }, error: null } as any);
    mockedDelete.mockResolvedValue({
      data: { item: pendingItem('cb-1', { status: 'cancelled' }) },
      error: null,
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is available when enabled and the server can be called back at its public URL', () => {
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));

    expect(result.current.available).toBe(true);
    expect(result.current.isChecking).toBe(false);
    expect(result.current.unavailableReason).toBeUndefined();
  });

  it('is not available when disabled, and does not ask the server', () => {
    const { result } = renderHook(() => useProvisioningCallback({ enabled: false }));

    expect(result.current.available).toBe(false);
    expect(result.current.isChecking).toBe(false);
    expect(mockedAvailabilityQuery).toHaveBeenCalledWith({ enabled: false });
  });

  it('is checking, not available, until the server has answered', () => {
    setAvailability(undefined);
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));

    expect(result.current.available).toBe(false);
    expect(result.current.isChecking).toBe(true);
    expect(result.current.unavailableReason).toBeUndefined();
  });

  it('is not available, with the reason, when the public URL cannot be called back', () => {
    setAvailability({
      available: false,
      kibana_url: 'https://kb.example.com',
      reason: NOT_HTTPS_REASON,
    });
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));

    expect(result.current.available).toBe(false);
    expect(result.current.unavailableReason).toBe(NOT_HTTPS_REASON);
  });

  it('start() creates a record with the identity details and returns the stack params', async () => {
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));

    let params: Record<string, string> | undefined;
    await act(async () => {
      params = await result.current.start({
        connectorName: '  my-identity  ',
        accountType: 'single-account',
        iacKey: 'sha256:abc',
        iacBlueprintId: 'federated-identity',
        iacBlueprintVersion: '1.0.0',
      });
    });

    expect(mockedCreate).toHaveBeenCalledWith({
      provider: 'aws',
      connector_name: 'my-identity',
      account_type: 'single-account',
      iac_key: 'sha256:abc',
      iac_blueprint_id: 'federated-identity',
      iac_blueprint_version: '1.0.0',
    });
    expect(params).toEqual({
      ElasticCallbackUrl: 'https://kb.example.com/api/fleet/iac_provisioner/callbacks/cb-1',
      ElasticCallbackToken: 'tok-1',
    });
    expect(result.current.status).toBe('pending');
  });

  it('leaves out a blank name and unset details', async () => {
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
    await act(async () => {
      await result.current.start({ connectorName: '   ' });
    });

    expect(mockedCreate).toHaveBeenCalledWith({ provider: 'aws' });
  });

  it('reports receiving while the server applies the report, then received', async () => {
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
    await act(async () => {
      await result.current.start({});
    });

    // The report arrived; the server is creating the identity.
    mockedGet.mockResolvedValue({
      data: { item: pendingItem('cb-1', { status: 'receiving', ...RECEIVED_VALUES }) },
      error: null,
    } as any);
    await poll();
    expect(result.current.status).toBe('receiving');
    expect(result.current.created).toBeUndefined();

    // A report the server had to give up on puts the record back to pending.
    mockedGet.mockResolvedValue({ data: { item: pendingItem('cb-1') }, error: null } as any);
    await poll();
    expect(result.current.status).toBe('pending');

    mockedGet.mockResolvedValue({
      data: {
        item: pendingItem('cb-1', {
          status: 'received',
          ...RECEIVED_VALUES,
          cloud_connector_id: 'cc-1',
        }),
      },
      error: null,
    } as any);
    await poll();
    expect(result.current.status).toBe('received');
  });

  it('polls while pending and exposes the created connector once received', async () => {
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
    await act(async () => {
      await result.current.start({});
    });

    await poll();
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith('cb-1');
    expect(result.current.status).toBe('pending');

    mockedGet.mockResolvedValue({
      data: {
        item: pendingItem('cb-1', {
          status: 'received',
          ...RECEIVED_VALUES,
          connector_name: 'my-identity',
          cloud_connector_id: 'cc-1',
        }),
      },
      error: null,
    } as any);
    await poll();

    expect(result.current.status).toBe('received');
    // The reported ARNs travel with the identity so the form can show them.
    expect(result.current.created).toEqual({
      id: 'cc-1',
      name: 'my-identity',
      ...RECEIVED_VALUES,
    });

    // Polling stops once received.
    await poll();
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it('stops polling as error when the record is gone', async () => {
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
    await act(async () => {
      await result.current.start({});
    });
    mockedGet.mockResolvedValue({ data: null, error: { statusCode: 404 } } as any);

    await poll();
    expect(result.current.status).toBe('error');
    await poll();
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('keeps polling through a transient error', async () => {
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
    await act(async () => {
      await result.current.start({});
    });
    mockedGet.mockResolvedValueOnce({ data: null, error: { statusCode: 503 } } as any);

    await poll();
    expect(result.current.status).toBe('pending');
    await poll();
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  describe('at the deadline', () => {
    const startAndPassDeadline = async () => {
      const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
      await act(async () => {
        await result.current.start({});
      });
      jest.setSystemTime(new Date('2026-10-13T12:00:01.000Z'));
      await poll();
      return result;
    };

    it('retires the record and stops polling as expired', async () => {
      const result = await startAndPassDeadline();

      expect(mockedDelete).toHaveBeenCalledWith('cb-1');
      expect(result.current.status).toBe('expired');
      // The deadline is checked before each request, so an expired record is never fetched.
      await poll();
      expect(mockedGet).not.toHaveBeenCalled();
      expect(mockedDelete).toHaveBeenCalledTimes(1);
      // Nothing is left to retire on a manual Create.
      await act(async () => {
        await result.current.cancel();
      });
      expect(mockedDelete).toHaveBeenCalledTimes(1);
    });

    it('surfaces the identity when the report landed just before', async () => {
      mockedDelete.mockResolvedValue({
        data: {
          item: pendingItem('cb-1', {
            status: 'received',
            ...RECEIVED_VALUES,
            cloud_connector_id: 'cc-1',
          }),
        },
        error: null,
      } as any);

      const result = await startAndPassDeadline();

      expect(result.current.status).toBe('received');
      expect(result.current.created).toEqual({ id: 'cc-1', name: 'cc-1', ...RECEIVED_VALUES });
    });

    it('waits a little longer, once, when the report is still being applied', async () => {
      mockedDelete.mockResolvedValue({
        data: { item: pendingItem('cb-1', { status: 'receiving', ...RECEIVED_VALUES }) },
        error: null,
      } as any);

      const result = await startAndPassDeadline();
      expect(result.current.status).toBe('receiving');
      await poll();
      expect(mockedGet).toHaveBeenCalledTimes(1);

      jest.setSystemTime(Date.now() + PROVISIONING_CALLBACK_RECEIVING_GRACE_MS + 1);
      await poll();
      expect(mockedDelete).toHaveBeenCalledTimes(2);
      expect(result.current.status).toBe('expired');
    });

    it('leaves a newer launch alone when its cancel settles after that launch', async () => {
      let resolveDelete: (value: unknown) => void = () => {};
      mockedDelete.mockReturnValue(new Promise((resolve) => (resolveDelete = resolve)) as any);
      const result = await startAndPassDeadline();
      expect(mockedDelete).toHaveBeenCalledWith('cb-1');

      // The clock is past the first record's expiry; the new one expires later.
      const later = pendingItem('cb-2', { expires_at: '2026-10-13T14:00:00.000Z' });
      mockedCreate.mockResolvedValue({ data: { item: later, token: 'k2' }, error: null } as any);
      mockedGet.mockResolvedValue({ data: { item: later }, error: null } as any);
      await act(async () => {
        await result.current.start({});
      });
      expect(result.current.status).toBe('pending');

      await act(async () => {
        resolveDelete({
          data: { item: pendingItem('cb-1', { status: 'cancelled' }) },
          error: null,
        });
      });

      expect(result.current.status).toBe('pending');
      await poll();
      expect(mockedGet).toHaveBeenCalledWith('cb-2');
    });

    it('watches again when a manual Create after a failed cancel finds the report being applied', async () => {
      mockedDelete.mockResolvedValue({ data: null, error: { statusCode: 503 } } as any);
      const result = await startAndPassDeadline();
      expect(result.current.status).toBe('expired');

      mockedDelete.mockResolvedValue({
        data: { item: pendingItem('cb-1', { status: 'receiving', ...RECEIVED_VALUES }) },
        error: null,
      } as any);
      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.cancel();
      });
      expect(outcome).toBe('created');
      expect(result.current.status).toBe('receiving');

      mockedGet.mockResolvedValue({
        data: {
          item: pendingItem('cb-1', {
            status: 'received',
            ...RECEIVED_VALUES,
            cloud_connector_id: 'cc-1',
          }),
        },
        error: null,
      } as any);
      await poll();
      expect(result.current.status).toBe('received');
      expect(result.current.created).toEqual({ id: 'cc-1', name: 'cc-1', ...RECEIVED_VALUES });
    });

    it('keeps the record for a manual Create to retire when the cancel failed', async () => {
      mockedDelete.mockResolvedValue({ data: null, error: { statusCode: 503 } } as any);

      const result = await startAndPassDeadline();
      expect(result.current.status).toBe('expired');

      mockedDelete.mockResolvedValue({
        data: { item: pendingItem('cb-1', { status: 'cancelled' }) },
        error: null,
      } as any);
      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.cancel();
      });
      expect(mockedDelete).toHaveBeenCalledTimes(2);
      expect(outcome).toBe('cancelled');
    });
  });

  it('a second start() waits on the new record only', async () => {
    mockedCreate
      .mockResolvedValueOnce({
        data: { item: pendingItem('cb-1'), token: 'k1' },
        error: null,
      } as any)
      .mockResolvedValueOnce({
        data: { item: pendingItem('cb-2'), token: 'k2' },
        error: null,
      } as any);
    mockedGet.mockResolvedValue({ data: { item: pendingItem('cb-2') }, error: null } as any);
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));

    await act(async () => {
      await result.current.start({});
    });
    let params: Record<string, string> | undefined;
    await act(async () => {
      params = await result.current.start({});
    });

    expect(params?.ElasticCallbackUrl).toBe(
      'https://kb.example.com/api/fleet/iac_provisioner/callbacks/cb-2'
    );
    // The superseded record is retired so its stack cannot create an unobserved identity.
    expect(mockedDelete).toHaveBeenCalledWith('cb-1');
    await poll();
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith('cb-2');
  });

  it('returns undefined and creates nothing when the callback is not available', async () => {
    setAvailability({
      available: false,
      reason: 'Kibana has no public URL: server.publicBaseUrl is not set.',
    });
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));

    let params: Record<string, string> | undefined;
    await act(async () => {
      params = await result.current.start({});
    });

    expect(params).toBeUndefined();
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('rejects and asks the server again when it refuses the record because its URL became unreachable', async () => {
    mockedCreate.mockResolvedValue({
      data: null,
      error: { statusCode: 412, message: NOT_HTTPS_REASON },
    } as any);
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));

    await act(async () => {
      await expect(result.current.start({})).rejects.toThrow(NOT_HTTPS_REASON);
    });

    expect(mockedRecheck).toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('returns undefined when disabled', async () => {
    const { result } = renderHook(() => useProvisioningCallback({ enabled: false }));
    let params: Record<string, string> | undefined;
    await act(async () => {
      params = await result.current.start({});
    });
    expect(params).toBeUndefined();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('rejects and stays idle when the record cannot be created, so no console opens', async () => {
    mockedCreate.mockResolvedValue({ data: null, error: { message: 'boom' } } as any);
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
    await act(async () => {
      await expect(result.current.start({})).rejects.toThrow('boom');
    });
    expect(result.current.status).toBe('idle');
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('a new start() leaves a previous received status behind even when no record is created', async () => {
    const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
    await act(async () => {
      await result.current.start({});
    });
    mockedGet.mockResolvedValue({
      data: {
        item: pendingItem('cb-1', {
          status: 'received',
          ...RECEIVED_VALUES,
          cloud_connector_id: 'cc-1',
        }),
      },
      error: null,
    } as any);
    await poll();
    expect(result.current.status).toBe('received');

    mockedCreate.mockResolvedValue({ data: null, error: { message: 'boom' } } as any);
    await act(async () => {
      await result.current.start({}).catch(() => {});
    });

    expect(result.current.status).toBe('idle');
  });

  describe('cancel()', () => {
    const startAndCancel = async () => {
      const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
      await act(async () => {
        await result.current.start({});
      });
      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.cancel();
      });
      return { result, outcome };
    };

    it('retires the record, stops polling and returns to idle', async () => {
      const { result, outcome } = await startAndCancel();

      expect(mockedDelete).toHaveBeenCalledWith('cb-1');
      expect(outcome).toBe('cancelled');
      expect(result.current.status).toBe('idle');
      await poll();
      expect(mockedGet).not.toHaveBeenCalled();
    });

    it('surfaces the identity when the stack had already reported', async () => {
      mockedDelete.mockResolvedValue({
        data: {
          item: pendingItem('cb-1', {
            status: 'received',
            ...RECEIVED_VALUES,
            connector_name: 'my-identity',
            cloud_connector_id: 'cc-1',
          }),
        },
        error: null,
      } as any);

      const { result, outcome } = await startAndCancel();

      expect(outcome).toBe('created');
      expect(result.current.status).toBe('received');
      expect(result.current.created).toEqual({
        id: 'cc-1',
        name: 'my-identity',
        ...RECEIVED_VALUES,
      });
      await poll();
      expect(mockedGet).not.toHaveBeenCalled();
    });

    it('keeps polling when the report is still being applied', async () => {
      mockedDelete.mockResolvedValue({
        data: { item: pendingItem('cb-1', { status: 'receiving', ...RECEIVED_VALUES }) },
        error: null,
      } as any);

      const { result, outcome } = await startAndCancel();

      expect(outcome).toBe('created');
      expect(result.current.status).toBe('receiving');
      await poll();
      expect(mockedGet).toHaveBeenCalledWith('cb-1');
    });

    it('reports the identity when a poll saw the report land while the cancel was in flight', async () => {
      let resolveDelete: (value: unknown) => void = () => {};
      mockedDelete.mockReturnValue(new Promise((resolve) => (resolveDelete = resolve)) as any);
      mockedGet.mockResolvedValue({
        data: {
          item: pendingItem('cb-1', {
            status: 'received',
            ...RECEIVED_VALUES,
            cloud_connector_id: 'cc-1',
          }),
        },
        error: null,
      } as any);
      const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
      await act(async () => {
        await result.current.start({});
      });

      // The cancel request is in flight when the next poll runs and sees the report.
      const cancelling = result.current.cancel();
      await poll();
      expect(result.current.status).toBe('received');
      resolveDelete({ data: { item: pendingItem('cb-1', { status: 'cancelled' }) }, error: null });
      let outcome: string | undefined;
      await act(async () => {
        outcome = await cancelling;
      });

      expect(outcome).toBe('created');
      expect(result.current.created).toEqual({ id: 'cc-1', name: 'cc-1', ...RECEIVED_VALUES });
    });

    it('stops waiting when the record is already gone', async () => {
      mockedDelete.mockResolvedValue({ data: null, error: { statusCode: 404 } } as any);

      const { result, outcome } = await startAndCancel();

      expect(outcome).toBe('cancelled');
      expect(result.current.status).toBe('idle');
    });

    it('keeps waiting when the record could not be retired', async () => {
      mockedDelete.mockResolvedValue({ data: null, error: { statusCode: 503 } } as any);

      const { result, outcome } = await startAndCancel();

      expect(outcome).toBe('failed');
      expect(result.current.status).toBe('pending');
      await poll();
      expect(mockedGet).toHaveBeenCalledWith('cb-1');
    });

    it('does nothing without a record to wait on', async () => {
      const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));

      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.cancel();
      });

      expect(outcome).toBe('cancelled');
      expect(mockedDelete).not.toHaveBeenCalled();
    });
  });

  it('does not poll for a record whose creation finished after unmount', async () => {
    let resolveCreate: (value: unknown) => void = () => {};
    mockedCreate.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)) as any);
    const { result, unmount } = renderHook(() => useProvisioningCallback({ enabled: true }));

    let params: Record<string, string> | undefined;
    const started = act(async () => {
      params = await result.current.start({});
    });
    // Let start() reach the create request, then take the form away while it is in flight.
    await act(async () => {});
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    unmount();
    resolveCreate({ data: { item: pendingItem('cb-late'), token: 'k' }, error: null });
    await started;

    expect(params).toBeUndefined();
    await poll();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('stops polling on unmount', async () => {
    const { result, unmount } = renderHook(() => useProvisioningCallback({ enabled: true }));
    await act(async () => {
      await result.current.start({});
    });

    unmount();
    await poll();

    expect(mockedGet).not.toHaveBeenCalled();
  });

  describe('deploy stage', () => {
    const receivedWithDeployment = (
      deployStatus: 'pending' | 'deploying' | 'deployed' | 'failed',
      error?: string
    ) =>
      pendingItem('cb-1', {
        status: 'received',
        ...RECEIVED_VALUES,
        connector_name: 'my-identity',
        cloud_connector_id: 'cc-1',
        onboarding_deployment_id: 'dep-1',
        deploy_status: deployStatus,
        ...(error ? { deploy_error: error } : {}),
      });

    it('sends the onboarding deployment id with the record', async () => {
      const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
      await act(async () => {
        await result.current.start({ onboardingDeploymentId: 'dep-1' });
      });

      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ onboarding_deployment_id: 'dep-1' })
      );
    });

    it('keeps polling as deploying after the identity exists until the deploy finishes', async () => {
      const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
      await act(async () => {
        await result.current.start({ onboardingDeploymentId: 'dep-1' });
      });

      mockedGet.mockResolvedValue({
        data: { item: receivedWithDeployment('deploying') },
        error: null,
      } as any);
      await poll();
      expect(result.current.status).toBe('deploying');
      expect(result.current.created).toEqual({
        id: 'cc-1',
        name: 'my-identity',
        ...RECEIVED_VALUES,
      });
      expect(result.current.deployOutcome).toBeUndefined();

      // Still watching.
      await poll();
      expect(mockedGet).toHaveBeenCalledTimes(2);

      mockedGet.mockResolvedValue({
        data: { item: receivedWithDeployment('deployed') },
        error: null,
      } as any);
      await poll();
      expect(result.current.status).toBe('received');
      expect(result.current.deployOutcome).toEqual({
        status: 'deployed',
        onboardingDeploymentId: 'dep-1',
      });

      // Polling stops once the deploy finished.
      await poll();
      expect(mockedGet).toHaveBeenCalledTimes(3);
    });

    it('reports a failed deploy with its error', async () => {
      const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
      await act(async () => {
        await result.current.start({ onboardingDeploymentId: 'dep-1' });
      });

      mockedGet.mockResolvedValue({
        data: { item: receivedWithDeployment('failed', 'boom') },
        error: null,
      } as any);
      await poll();

      expect(result.current.status).toBe('received');
      expect(result.current.deployOutcome).toEqual({
        status: 'failed',
        onboardingDeploymentId: 'dep-1',
        error: 'boom',
      });
    });

    it('the deadline leaves a deploying record alone', async () => {
      const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
      await act(async () => {
        await result.current.start({ onboardingDeploymentId: 'dep-1' });
      });
      mockedGet.mockResolvedValue({
        data: { item: receivedWithDeployment('deploying') },
        error: null,
      } as any);
      await poll();
      expect(result.current.status).toBe('deploying');

      jest.setSystemTime(new Date('2026-10-13T12:00:01.000Z'));
      await poll();

      expect(mockedDelete).not.toHaveBeenCalled();
      expect(result.current.status).toBe('deploying');
      expect(mockedGet).toHaveBeenCalledTimes(2);
    });

    it('cancel does nothing to a deploying record', async () => {
      const { result } = renderHook(() => useProvisioningCallback({ enabled: true }));
      await act(async () => {
        await result.current.start({ onboardingDeploymentId: 'dep-1' });
      });
      mockedGet.mockResolvedValue({
        data: { item: receivedWithDeployment('deploying') },
        error: null,
      } as any);
      await poll();

      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.cancel();
      });

      expect(outcome).toBe('created');
      expect(mockedDelete).not.toHaveBeenCalled();
      expect(result.current.status).toBe('deploying');
    });
  });
});
