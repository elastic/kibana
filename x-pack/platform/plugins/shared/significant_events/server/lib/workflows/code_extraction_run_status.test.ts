/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExecutionStatus,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import { getCodeExtractionRunDetails } from './code_extraction_run_status';

const step = (overrides: Partial<WorkflowStepExecutionDto>): WorkflowStepExecutionDto =>
  ({
    id: 'step',
    stepId: 'list_repos',
    workflowRunId: 'run',
    workflowId: 'workflow',
    status: ExecutionStatus.COMPLETED,
    startedAt: '2026-01-01T00:00:00.000Z',
    topologicalIndex: 0,
    globalExecutionIndex: 0,
    stepExecutionIndex: 0,
    scopeStack: [],
    ...overrides,
  } as WorkflowStepExecutionDto);

const execution = (stepExecutions: WorkflowStepExecutionDto[]): WorkflowExecutionDto =>
  ({
    id: 'run',
    spaceId: 'default',
    status: ExecutionStatus.RUNNING,
    isTestRun: false,
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: '',
    error: null,
    workflowId: 'workflow',
    workflowName: 'workflow',
    workflowDefinition: {},
    stepExecutions,
    duration: null,
    yaml: '',
  } as WorkflowExecutionDto);

describe('getCodeExtractionRunDetails', () => {
  it('returns useful zero-value details when no execution exists', () => {
    expect(getCodeExtractionRunDetails(null)).toMatchObject({
      elapsedMs: 0,
      progress: { repositoriesTotal: 0, servicesDiscovered: 0 },
      recentFailures: [],
      perRepository: [],
    });
  });

  it('stops elapsed time at the execution finish timestamp', () => {
    const completed = execution([]);
    completed.status = ExecutionStatus.COMPLETED;
    completed.finishedAt = '2026-01-01T00:00:03.000Z';

    expect(
      getCodeExtractionRunDetails(completed, Date.parse('2026-01-01T00:01:00.000Z')).elapsedMs
    ).toBe(3000);
  });

  it('aggregates typed outputs and finds the active service step', () => {
    const result = getCodeExtractionRunDetails(
      execution([
        step({ stepId: 'list_repos', output: { repos: [{ repository: 'org/repo' }] } }),
        step({
          stepId: 'discover_services',
          globalExecutionIndex: 1,
          input: { body: { repository: 'org/repo' } },
          output: { services: [{ name: 'api' }, { name: 'worker' }] },
        }),
        step({
          stepId: 'identify_service',
          globalExecutionIndex: 2,
          input: {
            body: { repository: 'org/repo', hasOtel: true, service: { name: 'api' } },
          },
          output: { loggingSitesFound: 0 },
        }),
        step({
          stepId: 'identify_otel_signals',
          globalExecutionIndex: 3,
          input: { body: { repository: 'org/repo', name: 'api' } },
          output: { otelSignalsFound: 4, queriesGenerated: 2 },
          executionTimeMs: 17,
        }),
        step({
          stepId: 'identify_service',
          status: ExecutionStatus.RUNNING,
          globalExecutionIndex: 4,
          stepExecutionIndex: 1,
          input: { body: { repository: 'org/repo', service: { name: 'worker' } } },
        }),
      ]),
      Date.parse('2026-01-01T00:00:01.000Z')
    );

    expect(result).toMatchObject({
      elapsedMs: 1000,
      current: {
        step: 'identify_service',
        repository: 'org/repo',
        service: 'worker',
        attempt: 1,
      },
      progress: {
        repositoriesTotal: 1,
        repositoriesStarted: 1,
        servicesDiscovered: 2,
        servicesCompleted: 1,
      },
      totals: { otelSignalsFound: 4, queriesGenerated: 2 },
      timings: { identify_otel_signals: 17 },
      perRepository: [
        {
          repository: 'org/repo',
          servicesDiscovered: 2,
          servicesCompleted: 1,
          status: 'running',
        },
      ],
    });
  });

  it('does not complete services before their required follow-up phase finishes', () => {
    const result = getCodeExtractionRunDetails(
      execution([
        step({
          stepId: 'discover_services',
          input: { body: { repository: 'org/repo' } },
          output: { services: [{ name: 'otel' }, { name: 'wrapped' }] },
        }),
        step({
          stepId: 'identify_service',
          globalExecutionIndex: 1,
          input: {
            body: { repository: 'org/repo', hasOtel: true, service: { name: 'otel' } },
          },
          output: { loggingSitesFound: 0 },
        }),
        step({
          stepId: 'identify_otel_signals',
          status: ExecutionStatus.RUNNING,
          globalExecutionIndex: 2,
          input: { body: { repository: 'org/repo', name: 'otel' } },
        }),
        step({
          stepId: 'identify_service',
          globalExecutionIndex: 3,
          input: { body: { repository: 'org/repo', service: { name: 'wrapped' } } },
          output: { loggingSitesFound: 0 },
        }),
        step({
          stepId: 'identify_service_with_wrappers',
          status: ExecutionStatus.RUNNING,
          globalExecutionIndex: 4,
          input: { body: { repository: 'org/repo', service: { name: 'wrapped' } } },
        }),
      ])
    );

    expect(result.progress.servicesCompleted).toBe(0);
    expect(result.progress.repositoriesCompleted).toBe(0);
    expect(result.perRepository[0]).toMatchObject({ status: 'running', servicesCompleted: 0 });
  });

  it('counts completed repositories before bounding their summaries', () => {
    const repos = Array.from({ length: 101 }, (_, index) => ({ repository: `repo-${index}` }));
    const discoverySteps = repos.map(({ repository }, index) =>
      step({
        stepId: 'discover_services',
        globalExecutionIndex: index + 1,
        input: { body: { repository } },
        output: { services: [] },
      })
    );
    const result = getCodeExtractionRunDetails(
      execution([step({ output: { repos } }), ...discoverySteps])
    );

    expect(result.progress.repositoriesCompleted).toBe(101);
    expect(result.perRepository).toHaveLength(100);
  });

  it('uses the latest retry outcome and bounds failure and repository projections', () => {
    const failures = Array.from({ length: 12 }, (_, index) =>
      step({
        stepId: 'identify_service',
        status: ExecutionStatus.FAILED,
        globalExecutionIndex: index,
        stepExecutionIndex: index,
        input: { body: { repository: `repo-${index}`, service: { name: 'svc' } } },
        error: { type: 'Error', message: `failure-${index}` },
      })
    );
    const repos = Array.from({ length: 101 }, (_, index) => ({ repository: `repo-${index}` }));
    const result = getCodeExtractionRunDetails(
      execution([
        step({ output: { repos } }),
        ...failures,
        step({
          stepId: 'identify_service',
          status: ExecutionStatus.COMPLETED,
          globalExecutionIndex: 20,
          input: { body: { repository: 'repo-0', service: { name: 'svc' } } },
          output: { featuresPersisted: 1 },
        }),
      ])
    );

    expect(result.recentFailures).toHaveLength(10);
    expect(result.recentFailures[0]).toMatchObject({ repository: 'repo-11', attempts: 1 });
    expect(result.recentFailures).not.toContainEqual(
      expect.objectContaining({ repository: 'repo-0' })
    );
    expect(result.progress.servicesFailed).toBe(11);
    expect(result.perRepository).toHaveLength(100);
    expect(result.progress.repositoriesTotal).toBe(101);
  });

  it('carries repository and service identity across retry controller scopes', () => {
    const foreachScopes = [
      {
        stepId: 'process_repos',
        nestedScopes: [{ nodeId: 'repos', nodeType: 'enter-foreach', scopeId: '2' }],
      },
      {
        stepId: 'process_services',
        nestedScopes: [{ nodeId: 'services', nodeType: 'enter-foreach', scopeId: '0' }],
      },
    ] as WorkflowStepExecutionDto['scopeStack'];
    const result = getCodeExtractionRunDetails(
      execution([
        step({
          stepId: 'identify_service',
          status: ExecutionStatus.FAILED,
          globalExecutionIndex: 1,
          stepType: 'kibana.request',
          scopeStack: [
            ...foreachScopes,
            {
              stepId: 'identify_service',
              nestedScopes: [{ nodeId: 'retry', nodeType: 'enter-retry', scopeId: '1-attempt' }],
            },
          ],
          input: {
            body: { repository: 'org/repo', service: { name: 'api' } },
          },
          error: { type: 'Error', message: 'fetch failed' },
        }),
        step({
          stepId: 'identify_service',
          status: ExecutionStatus.FAILED,
          globalExecutionIndex: 2,
          stepType: 'retry',
          scopeStack: foreachScopes,
          error: { type: 'Error', message: 'retry exhausted' },
        }),
      ])
    );

    expect(result.recentFailures).toEqual([
      expect.objectContaining({
        repository: 'org/repo',
        service: 'api',
        attempts: 1,
        error: 'retry exhausted',
      }),
    ]);
  });
});
