/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AWS_ONBOARDING_FLOW_ENTERED_EVENT,
  AWS_ONBOARDING_CREDENTIALS_ADDED_EVENT,
  AWS_ONBOARDING_DEPLOY_CLICKED_EVENT,
  AWS_ONBOARDING_AGENTLESS_ENROLLMENT_SUCCEEDED_EVENT,
  AWS_ONBOARDING_FIRST_DATA_ARRIVED_EVENT,
  AWS_ONBOARDING_FIRST_DATA_TIMEOUT_EVENT,
  AWS_ONBOARDING_TELEMETRY_STORAGE_KEY,
  reportAwsOnboardingFlowEntered,
  reportAwsOnboardingCredentialsAdded,
  reportAwsOnboardingDeployClicked,
  reportAwsOnboardingEnrollmentSucceeded,
  reportAwsOnboardingFirstDataArrived,
  reportAwsOnboardingFirstDataTimeout,
} from './aws_onboarding_events';

function makeStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as unknown as Storage;
}

function makeAnalytics() {
  return { reportEvent: jest.fn() };
}

function readState(storage: Storage) {
  return JSON.parse(storage.getItem(AWS_ONBOARDING_TELEMETRY_STORAGE_KEY) ?? '{}');
}

function writeState(storage: Storage, state: object) {
  storage.setItem(AWS_ONBOARDING_TELEMETRY_STORAGE_KEY, JSON.stringify(state));
}

describe('reportAwsOnboardingFlowEntered', () => {
  it('emits flow_entered with package_version', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    reportAwsOnboardingFlowEntered(analytics, storage, '0.5.0');
    expect(analytics.reportEvent).toHaveBeenCalledWith(
      AWS_ONBOARDING_FLOW_ENTERED_EVENT.eventType,
      { package_version: '0.5.0' }
    );
  });

  it('stamps flowEnteredAt and sets flow_entered guard in storage', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    const before = Date.now();
    reportAwsOnboardingFlowEntered(analytics, storage, '0.5.0');
    const after = Date.now();
    const state = readState(storage);
    expect(state.flowEnteredAt).toBeGreaterThanOrEqual(before);
    expect(state.flowEnteredAt).toBeLessThanOrEqual(after);
    expect(state.reported?.flow_entered).toBe(true);
  });

  it('always fires (not guarded — resets state on each new flow entry)', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    reportAwsOnboardingFlowEntered(analytics, storage, '0.5.0');
    reportAwsOnboardingFlowEntered(analytics, storage, '0.5.0');
    expect(analytics.reportEvent).toHaveBeenCalledTimes(2);
  });
});

describe('reportAwsOnboardingCredentialsAdded', () => {
  it('emits credentials_added with non-negative duration_ms', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { flowEnteredAt: Date.now() - 1000 });
    reportAwsOnboardingCredentialsAdded(analytics, storage);
    expect(analytics.reportEvent).toHaveBeenCalledWith(
      AWS_ONBOARDING_CREDENTIALS_ADDED_EVENT.eventType,
      expect.objectContaining({ duration_ms: expect.any(Number) })
    );
    const [, payload] = analytics.reportEvent.mock.calls[0];
    expect(payload.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('does not fire when flowEnteredAt is missing', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    const result = reportAwsOnboardingCredentialsAdded(analytics, storage);
    expect(result).toBe(false);
    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('does not double-fire (single-fire guard)', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { flowEnteredAt: Date.now() - 1000 });
    reportAwsOnboardingCredentialsAdded(analytics, storage);
    reportAwsOnboardingCredentialsAdded(analytics, storage);
    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
  });

  it('sets credentials_added guard in storage after firing', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { flowEnteredAt: Date.now() });
    reportAwsOnboardingCredentialsAdded(analytics, storage);
    expect(readState(storage).reported?.credentials_added).toBe(true);
  });
});

describe('reportAwsOnboardingDeployClicked', () => {
  it('emits deploy_clicked with path and duration_ms for agentless', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { flowEnteredAt: Date.now() - 2000 });
    reportAwsOnboardingDeployClicked(analytics, storage, {
      path: 'agentless',
      services: ['cloudwatch', 'elb'],
    });
    expect(analytics.reportEvent).toHaveBeenCalledWith(
      AWS_ONBOARDING_DEPLOY_CLICKED_EVENT.eventType,
      expect.objectContaining({ path: 'agentless', services: ['cloudwatch', 'elb'] })
    );
    const [, payload] = analytics.reportEvent.mock.calls[0];
    expect(payload.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('emits deploy_clicked without services for cloudformation path', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { flowEnteredAt: Date.now() });
    reportAwsOnboardingDeployClicked(analytics, storage, { path: 'aws_cloudformation' });
    const [, payload] = analytics.reportEvent.mock.calls[0];
    expect(payload.path).toBe('aws_cloudformation');
    expect(payload.services).toBeUndefined();
  });

  it('stamps deployClickedAt in storage', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    const before = Date.now();
    writeState(storage, { flowEnteredAt: before - 100 });
    reportAwsOnboardingDeployClicked(analytics, storage, { path: 'agentless' });
    const state = readState(storage);
    expect(state.deployClickedAt).toBeGreaterThanOrEqual(before);
  });

  it('does not fire when flowEnteredAt is missing', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    const result = reportAwsOnboardingDeployClicked(analytics, storage, { path: 'agentless' });
    expect(result).toBe(false);
    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('does not double-fire the same path (single-fire guard per path)', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { flowEnteredAt: Date.now() });
    reportAwsOnboardingDeployClicked(analytics, storage, { path: 'agentless' });
    reportAwsOnboardingDeployClicked(analytics, storage, { path: 'agentless' });
    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
  });

  it('allows firing for a different path after one path is guarded', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { flowEnteredAt: Date.now() });
    reportAwsOnboardingDeployClicked(analytics, storage, { path: 'agentless' });
    reportAwsOnboardingDeployClicked(analytics, storage, { path: 'aws_cloudformation' });
    expect(analytics.reportEvent).toHaveBeenCalledTimes(2);
  });
});

describe('reportAwsOnboardingEnrollmentSucceeded', () => {
  it('emits enrollment_succeeded with duration_ms since deploy clicked', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { flowEnteredAt: Date.now() - 5000, deployClickedAt: Date.now() - 2000 });
    reportAwsOnboardingEnrollmentSucceeded(analytics, storage);
    expect(analytics.reportEvent).toHaveBeenCalledWith(
      AWS_ONBOARDING_AGENTLESS_ENROLLMENT_SUCCEEDED_EVENT.eventType,
      expect.objectContaining({ duration_ms: expect.any(Number) })
    );
    const [, payload] = analytics.reportEvent.mock.calls[0];
    expect(payload.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('does not fire when deployClickedAt is missing', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { flowEnteredAt: Date.now() });
    const result = reportAwsOnboardingEnrollmentSucceeded(analytics, storage);
    expect(result).toBe(false);
    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('does not double-fire', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { flowEnteredAt: Date.now() - 3000, deployClickedAt: Date.now() - 1000 });
    reportAwsOnboardingEnrollmentSucceeded(analytics, storage);
    reportAwsOnboardingEnrollmentSucceeded(analytics, storage);
    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
  });
});

describe('reportAwsOnboardingFirstDataArrived', () => {
  it('emits first_data_arrived with package_name and duration_ms', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { deployClickedAt: Date.now() - 3000 });
    reportAwsOnboardingFirstDataArrived(analytics, storage, 'aws_cloudwatch_input_otel');
    expect(analytics.reportEvent).toHaveBeenCalledWith(
      AWS_ONBOARDING_FIRST_DATA_ARRIVED_EVENT.eventType,
      expect.objectContaining({
        package_name: 'aws_cloudwatch_input_otel',
        duration_ms: expect.any(Number),
      })
    );
  });

  it('does not fire when deployClickedAt is missing', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    const result = reportAwsOnboardingFirstDataArrived(
      analytics,
      storage,
      'aws_cloudwatch_input_otel'
    );
    expect(result).toBe(false);
    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('does not double-fire for the same service', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { deployClickedAt: Date.now() });
    reportAwsOnboardingFirstDataArrived(analytics, storage, 'aws_cloudwatch_input_otel');
    reportAwsOnboardingFirstDataArrived(analytics, storage, 'aws_cloudwatch_input_otel');
    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
  });
});

describe('reportAwsOnboardingFirstDataTimeout', () => {
  it('emits first_data_timeout with package_name', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { deployClickedAt: Date.now() });
    reportAwsOnboardingFirstDataTimeout(analytics, storage, 'aws_cloudwatch_input_otel');
    expect(analytics.reportEvent).toHaveBeenCalledWith(
      AWS_ONBOARDING_FIRST_DATA_TIMEOUT_EVENT.eventType,
      { package_name: 'aws_cloudwatch_input_otel' }
    );
  });

  it('does not fire when deployClickedAt is missing', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    const result = reportAwsOnboardingFirstDataTimeout(
      analytics,
      storage,
      'aws_cloudwatch_input_otel'
    );
    expect(result).toBe(false);
    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('does not double-fire for the same package', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { deployClickedAt: Date.now() });
    reportAwsOnboardingFirstDataTimeout(analytics, storage, 'aws_cloudwatch_input_otel');
    reportAwsOnboardingFirstDataTimeout(analytics, storage, 'aws_cloudwatch_input_otel');
    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
  });

  it('fires independently per package', () => {
    const analytics = makeAnalytics();
    const storage = makeStorage();
    writeState(storage, { deployClickedAt: Date.now() });
    reportAwsOnboardingFirstDataTimeout(analytics, storage, 'package_a');
    reportAwsOnboardingFirstDataTimeout(analytics, storage, 'package_b');
    expect(analytics.reportEvent).toHaveBeenCalledTimes(2);
  });
});
