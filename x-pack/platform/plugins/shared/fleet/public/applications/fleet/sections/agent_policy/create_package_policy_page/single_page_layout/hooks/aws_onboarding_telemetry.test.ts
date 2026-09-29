/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act } from '@testing-library/react';

import {
  reportAwsOnboardingCredentialsAdded,
  reportAwsOnboardingDeployClicked,
  reportAwsOnboardingEnrollmentSucceeded,
  AWS_ONBOARDING_TELEMETRY_STORAGE_KEY,
} from '../../../../../../../../common/telemetry/aws_onboarding_events';
import { useStartServices } from '../../../../../../../hooks';
import { useIntraAppState } from '../../../../../../../hooks/use_intra_app_state';

import { useAwsOnboardingTelemetry } from './aws_onboarding_telemetry';

vi.mock('../../../../../../../../common/telemetry/aws_onboarding_events', async () => {
  const mocked = {
    ...(await vi.importActual('../../../../../../../../common/telemetry/aws_onboarding_events')),
    reportAwsOnboardingCredentialsAdded: vi.fn(),
    reportAwsOnboardingDeployClicked: vi.fn(),
    reportAwsOnboardingEnrollmentSucceeded: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../../../hooks', async () => {
  const mocked = {
    ...(await vi.importActual('../../../../../../../hooks')),
    useStartServices: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../../../hooks/use_intra_app_state', () => {
  const mocked = {
    useIntraAppState: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockAnalytics = { reportEvent: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.removeItem(AWS_ONBOARDING_TELEMETRY_STORAGE_KEY);
  (useStartServices as Mock).mockReturnValue({ analytics: mockAnalytics });
  (useIntraAppState as Mock).mockReturnValue({
    telemetrySource: 'aws_quickstart',
  });
});

describe('useAwsOnboardingTelemetry — gating', () => {
  it('calls helpers when source is aws_quickstart and package matches', () => {
    const { result } = renderHook(() =>
      useAwsOnboardingTelemetry({ pkgName: 'aws_cloudwatch_input_otel' })
    );
    act(() => result.current.reportCredentialsAdded());
    expect(reportAwsOnboardingCredentialsAdded).toHaveBeenCalledWith(mockAnalytics, sessionStorage);
  });

  it('no-ops when telemetrySource is not aws_quickstart', () => {
    (useIntraAppState as Mock).mockReturnValue({ telemetrySource: undefined });
    const { result } = renderHook(() =>
      useAwsOnboardingTelemetry({ pkgName: 'aws_cloudwatch_input_otel' })
    );
    act(() => result.current.reportCredentialsAdded());
    expect(reportAwsOnboardingCredentialsAdded).not.toHaveBeenCalled();
  });

  it('no-ops when pkgName does not match AWS_ONBOARDING_PACKAGE_NAME', () => {
    const { result } = renderHook(() =>
      useAwsOnboardingTelemetry({ pkgName: 'some_other_package' })
    );
    act(() => result.current.reportCredentialsAdded());
    expect(reportAwsOnboardingCredentialsAdded).not.toHaveBeenCalled();
  });

  it('no-ops when pkgName is undefined', () => {
    const { result } = renderHook(() => useAwsOnboardingTelemetry({ pkgName: undefined }));
    act(() => result.current.reportCredentialsAdded());
    expect(reportAwsOnboardingCredentialsAdded).not.toHaveBeenCalled();
  });

  it('no-ops when analytics is unavailable', () => {
    (useStartServices as Mock).mockReturnValue({ analytics: undefined });
    const { result } = renderHook(() =>
      useAwsOnboardingTelemetry({ pkgName: 'aws_cloudwatch_input_otel' })
    );
    act(() => result.current.reportCredentialsAdded());
    expect(reportAwsOnboardingCredentialsAdded).not.toHaveBeenCalled();
  });
});

describe('useAwsOnboardingTelemetry — reportDeployClicked', () => {
  it('passes path and services to the helper', () => {
    const { result } = renderHook(() =>
      useAwsOnboardingTelemetry({ pkgName: 'aws_cloudwatch_input_otel' })
    );
    act(() => result.current.reportDeployClicked('agentless', ['cloudwatch']));
    expect(reportAwsOnboardingDeployClicked).toHaveBeenCalledWith(mockAnalytics, sessionStorage, {
      path: 'agentless',
      services: ['cloudwatch'],
    });
  });

  it('passes cloudformation path without services', () => {
    const { result } = renderHook(() =>
      useAwsOnboardingTelemetry({ pkgName: 'aws_cloudwatch_input_otel' })
    );
    act(() => result.current.reportDeployClicked('aws_cloudformation'));
    expect(reportAwsOnboardingDeployClicked).toHaveBeenCalledWith(mockAnalytics, sessionStorage, {
      path: 'aws_cloudformation',
      services: undefined,
    });
  });
});

describe('useAwsOnboardingTelemetry — reportEnrollmentSucceeded', () => {
  it('calls the helper when conditions are met', () => {
    const { result } = renderHook(() =>
      useAwsOnboardingTelemetry({ pkgName: 'aws_cloudwatch_input_otel' })
    );
    act(() => result.current.reportEnrollmentSucceeded());
    expect(reportAwsOnboardingEnrollmentSucceeded).toHaveBeenCalledWith(
      mockAnalytics,
      sessionStorage
    );
  });
});
