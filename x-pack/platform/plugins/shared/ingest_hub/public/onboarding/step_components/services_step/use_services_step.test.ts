/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { useServicesStep } from './use_services_step';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { AWS_SERVICES_STATIC, buildAwsServiceMatrix } from '../../aws_service_matrix';

const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;

// Build the matrix with minimal mocked packages so signalType is derived from data_stream.type.
// AWS_SERVICES_MAP would have signalType:undefined (no manifest data), breaking signal-filter tests.
const MOCK_PACKAGES: Record<string, any> = {
  aws: {
    policy_templates: AWS_SERVICES_STATIC.filter((e) => e.packageName === 'aws').map((e) => ({
      name: e.id,
      data_streams: [e.id],
      deployment_modes: { agentless: { enabled: true } },
    })),
    data_streams: AWS_SERVICES_STATIC.filter((e) => e.packageName === 'aws').map((e) => ({
      path: e.id,
      type: e.id.includes('_metrics') || e.id === 'billing' ? 'metrics' : 'logs',
      streams: [{ input: 'aws-s3', vars: [], enabled: true }],
    })),
  },
  aws_bedrock: {
    policy_templates: [],
    data_streams: [
      { path: 'guardrails', type: 'metrics', streams: [] },
      { path: 'invocation', type: 'logs', streams: [] },
      { path: 'runtime', type: 'metrics', streams: [] },
    ],
  },
  aws_bedrock_agentcore: {
    policy_templates: [],
    data_streams: [{ path: 'bedrock_agentcore', type: 'logs', streams: [] }],
  },
  awsfargate: {
    policy_templates: [],
    data_streams: [{ path: 'task_stats', type: 'metrics', streams: [] }],
  },
  aws_mq: {
    policy_templates: [],
    data_streams: [{ path: 'mq', type: 'metrics', streams: [] }],
  },
  aws_cloudtrail_otel: {
    policy_templates: [],
    data_streams: [{ path: 'cloudtrail_otel', type: 'logs', streams: [] }],
  },
  aws_vpcflow_otel: {
    policy_templates: [],
    data_streams: [{ path: 'vpcflow_otel', type: 'logs', streams: [] }],
  },
  aws_waf_otel: {
    policy_templates: [],
    data_streams: [{ path: 'waf_otel', type: 'logs', streams: [] }],
  },
  aws_logs: {
    policy_templates: [],
    data_streams: [{ path: 'aws_logs', type: 'logs', streams: [] }],
  },
};

const MATRIX = buildAwsServiceMatrix(MOCK_PACKAGES, AWS_SERVICES_STATIC);

// Use a real writable ref so setSelectedServiceIds triggers re-renders.
function setupFlow(initial: string[] = []) {
  let ids = initial;
  mockUseOnboardingFlow.mockImplementation(() => ({
    servicesStep: { selectedServiceIds: ids },
    setSelectedServiceIds: jest.fn((next: string[]) => {
      ids = next;
      // Re-mock so next render picks up the new ids.
      setupFlow(ids);
    }),
    awsServiceMatrix: MATRIX,
  }));
}

describe('useServicesStep — categoryStats signal-filter consistency', () => {
  beforeEach(() => setupFlow());

  it('badge total is not narrowed by the search query', () => {
    const { result } = renderHook(() => useServicesStep({ onContinue: jest.fn() }));

    const [firstCat] = result.current.categories;
    const totalBeforeSearch = result.current.categoryStats.get(firstCat)?.total ?? 0;
    expect(totalBeforeSearch).toBeGreaterThan(0);

    // Apply a search that matches nothing — categories list collapses, but we
    // saved firstCat above. Re-render with a search that matches the category name
    // so the category stays visible but the service count would shrink if we used
    // filteredServices. Instead use a partial match that hits at least one service.
    const firstService = MATRIX.find((s) => s.showInUI && s.category === firstCat);
    expect(firstService).toBeDefined();

    act(() => {
      result.current.setSearchQuery(firstService!.name.slice(0, 5));
    });

    // The category should still be present (search matched at least one service in it).
    const statsAfterSearch = result.current.categoryStats.get(firstCat);
    expect(statsAfterSearch).toBeDefined();
    // total must be the full signal-filtered count for the category, not just the search hits.
    expect(statsAfterSearch!.total).toBe(totalBeforeSearch);
  });

  it('badge total matches the signal-filtered count, not the full category count', () => {
    const { result } = renderHook(() => useServicesStep({ onContinue: jest.fn() }));

    // Find a category that has services of both signal types.
    const mixedCat = result.current.categories.find((cat) => {
      const allInCat = MATRIX.filter((s) => s.showInUI && s.category === cat);
      const hasLogs = allInCat.some((s) => s.signalType === 'logs');
      const hasMetrics = allInCat.some((s) => s.signalType === 'metrics');
      return hasLogs && hasMetrics;
    });

    if (!mixedCat) return; // No mixed category in the matrix — skip.

    const allInMixed = MATRIX.filter((s) => s.showInUI && s.category === mixedCat);
    const expectedLogsTotal = allInMixed.filter((s) => s.signalType === 'logs').length;
    const expectedMetricsTotal = allInMixed.filter((s) => s.signalType === 'metrics').length;

    act(() => result.current.setSignalFilter('logs'));
    const logsStats = result.current.categoryStats.get(mixedCat);
    expect(logsStats?.total).toBe(expectedLogsTotal);

    act(() => result.current.setSignalFilter('metrics'));
    const metricsStats = result.current.categoryStats.get(mixedCat);
    expect(metricsStats?.total).toBe(expectedMetricsTotal);
  });

  it('selected count only includes signal-filtered services', () => {
    const { result } = renderHook(() => useServicesStep({ onContinue: jest.fn() }));

    // Find a category with metrics services.
    act(() => result.current.setSignalFilter('metrics'));

    const [firstCat] = result.current.categories;
    expect(firstCat).toBeDefined();

    const metricsInCat = MATRIX.filter(
      (s) => s.showInUI && s.category === firstCat && s.signalType === 'metrics'
    );
    expect(metricsInCat.length).toBeGreaterThan(0);

    // Manually pre-select all metrics services in that category.
    setupFlow(metricsInCat.map((s) => s.id));

    const { result: result2 } = renderHook(() => useServicesStep({ onContinue: jest.fn() }));
    act(() => result2.current.setSignalFilter('metrics'));

    const stats = result2.current.categoryStats.get(firstCat);
    expect(stats?.selected).toBe(metricsInCat.length);
    expect(stats?.total).toBe(metricsInCat.length);
  });
});

describe('useServicesStep — categories hidden when signal has no matching services', () => {
  // One logs-only category (compute), one metrics-only category (databases).
  // Validates that switching the signal filter drops the non-matching category entirely.
  const SPLIT_MATRIX: AwsServiceMatrixEntry[] = [
    {
      id: 'svc_logs',
      name: 'Logs Service',
      category: 'compute',
      signalType: 'logs',
      deploymentMethods: [{ method: 'ecf', preferred: true }],
      showInUI: true,
      defaultEnabled: true,
      packageName: 'aws',
    },
    {
      id: 'svc_metrics',
      name: 'Metrics Service',
      category: 'databases',
      signalType: 'metrics',
      deploymentMethods: [{ method: 'ecf', preferred: true }],
      showInUI: true,
      defaultEnabled: true,
      packageName: 'aws',
    },
  ] as AwsServiceMatrixEntry[];

  beforeEach(() => {
    mockUseOnboardingFlow.mockImplementation(() => ({
      servicesStep: { selectedServiceIds: [] },
      setSelectedServiceIds: jest.fn(),
      awsServiceMatrix: SPLIT_MATRIX,
    }));
  });

  it('shows both categories when signal filter is all', () => {
    const { result } = renderHook(() => useServicesStep({ onContinue: jest.fn() }));
    expect(result.current.categories).toContain('compute');
    expect(result.current.categories).toContain('databases');
  });

  it('hides metrics-only category when filtering for logs', () => {
    const { result } = renderHook(() => useServicesStep({ onContinue: jest.fn() }));
    act(() => result.current.setSignalFilter('logs'));
    expect(result.current.categories).toContain('compute');
    expect(result.current.categories).not.toContain('databases');
  });

  it('hides logs-only category when filtering for metrics', () => {
    const { result } = renderHook(() => useServicesStep({ onContinue: jest.fn() }));
    act(() => result.current.setSignalFilter('metrics'));
    expect(result.current.categories).not.toContain('compute');
    expect(result.current.categories).toContain('databases');
  });
});
