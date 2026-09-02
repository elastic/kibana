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

const MAX_RECENT_FAILURES = 10;
const MAX_REPOSITORIES = 100;
const MAX_TEXT_LENGTH = 1_000;

type CodeExtractionPhase =
  | 'repository_discovery'
  | 'service_analysis'
  | 'wrapper_investigation'
  | 'otel_analysis';

type CodeExtractionStepId =
  | 'list_repos'
  | 'discover_services'
  | 'identify_service'
  | 'identify_service_with_wrappers'
  | 'run_logging_wrappers_agent'
  | 'identify_otel_signals';

type TimingStepId =
  | 'list_repos'
  | 'discover_services'
  | 'identify_service'
  | 'run_logging_wrappers_agent'
  | 'identify_otel_signals';

export interface CodeExtractionRunDetails {
  startedAt?: string;
  elapsedMs: number;
  current?: {
    phase: CodeExtractionPhase;
    step: CodeExtractionStepId;
    repository?: string;
    service?: string;
    attempt: number;
    stepStartedAt?: string;
  };
  progress: {
    repositoriesTotal: number;
    repositoriesStarted: number;
    repositoriesCompleted: number;
    servicesDiscovered: number;
    servicesCompleted: number;
    servicesFailed: number;
  };
  totals: {
    loggingSitesFound: number;
    featuresPersisted: number;
    queriesGenerated: number;
    otelSignalsFound: number;
    wrapperInvestigations: number;
  };
  timings: Record<TimingStepId, number>;
  recentFailures: Array<{
    repository?: string;
    service?: string;
    step: CodeExtractionStepId;
    attempts: number;
    error: string;
  }>;
  perRepository: Array<{
    repository: string;
    servicesDiscovered: number;
    servicesCompleted: number;
    servicesFailed: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
  }>;
}

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value.slice(0, MAX_TEXT_LENGTH) : undefined;

const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;

const getBody = (step: WorkflowStepExecutionDto): JsonRecord =>
  isRecord(step.input) && isRecord(step.input.body) ? step.input.body : {};

const getService = (step: WorkflowStepExecutionDto): JsonRecord => {
  const body = getBody(step);
  return isRecord(body.service) ? body.service : body;
};

const getRepository = (step: WorkflowStepExecutionDto): string | undefined =>
  asString(getBody(step).repository);

const getServiceName = (step: WorkflowStepExecutionDto): string | undefined =>
  asString(getService(step).name);

const stepIds = new Set<CodeExtractionStepId>([
  'list_repos',
  'discover_services',
  'identify_service',
  'identify_service_with_wrappers',
  'run_logging_wrappers_agent',
  'identify_otel_signals',
]);

const phaseFor = (stepId: CodeExtractionStepId): CodeExtractionPhase => {
  switch (stepId) {
    case 'list_repos':
    case 'discover_services':
      return 'repository_discovery';
    case 'run_logging_wrappers_agent':
      return 'wrapper_investigation';
    case 'identify_otel_signals':
      return 'otel_analysis';
    default:
      return 'service_analysis';
  }
};

const isSuccessful = (step: WorkflowStepExecutionDto): boolean =>
  step.status === ExecutionStatus.COMPLETED;

const isActive = (step: WorkflowStepExecutionDto): boolean =>
  ![
    ExecutionStatus.COMPLETED,
    ExecutionStatus.FAILED,
    ExecutionStatus.TIMED_OUT,
    ExecutionStatus.CANCELLED,
    ExecutionStatus.SKIPPED,
  ].includes(step.status);

const stepOrder = (step: WorkflowStepExecutionDto): number => step.globalExecutionIndex ?? 0;

const latestByKey = (
  steps: WorkflowStepExecutionDto[],
  key: (step: WorkflowStepExecutionDto) => string
) => {
  const latest = new Map<string, WorkflowStepExecutionDto>();
  for (const step of steps) {
    const existing = latest.get(key(step));
    if (!existing || stepOrder(step) > stepOrder(existing)) latest.set(key(step), step);
  }
  return [...latest.values()];
};

/** Builds a small, safe progress projection from typed workflow execution records. */
export const getCodeExtractionRunDetails = (
  execution: WorkflowExecutionDto | null,
  now = Date.now()
): CodeExtractionRunDetails => {
  const startedAtMs = execution?.startedAt ? Date.parse(execution.startedAt) : Number.NaN;
  const finishedAtMs = execution?.finishedAt ? Date.parse(execution.finishedAt) : Number.NaN;
  const elapsedEndMs = Number.isFinite(finishedAtMs) ? finishedAtMs : now;
  const details: CodeExtractionRunDetails = {
    ...(execution?.startedAt ? { startedAt: execution.startedAt } : {}),
    elapsedMs: Number.isFinite(startedAtMs) ? Math.max(0, elapsedEndMs - startedAtMs) : 0,
    progress: {
      repositoriesTotal: 0,
      repositoriesStarted: 0,
      repositoriesCompleted: 0,
      servicesDiscovered: 0,
      servicesCompleted: 0,
      servicesFailed: 0,
    },
    totals: {
      loggingSitesFound: 0,
      featuresPersisted: 0,
      queriesGenerated: 0,
      otelSignalsFound: 0,
      wrapperInvestigations: 0,
    },
    timings: {
      list_repos: 0,
      discover_services: 0,
      identify_service: 0,
      run_logging_wrappers_agent: 0,
      identify_otel_signals: 0,
    },
    recentFailures: [],
    perRepository: [],
  };
  if (!execution) return details;

  const steps = execution.stepExecutions.filter((step) =>
    stepIds.has(step.stepId as CodeExtractionStepId)
  );
  const listRepos = latestByKey(
    steps.filter((step) => step.stepId === 'list_repos'),
    (step) => step.stepId
  )[0];
  const listOutput = isRecord(listRepos?.output) ? listRepos.output : {};
  const repos = Array.isArray(listOutput.repos) ? listOutput.repos : [];
  const repositoryNames = new Set(
    repos
      .map((repo) => (isRecord(repo) ? asString(repo.repository) : undefined))
      .filter((name): name is string => Boolean(name))
  );

  const scopeKey = (step: WorkflowStepExecutionDto): string => JSON.stringify(step.scopeStack);
  // Retry controllers and their request attempts have different trailing scopes.
  // The enclosing foreach iteration IDs are stable and identify the same
  // repository/service across those records.
  const iterationKey = (step: WorkflowStepExecutionDto): string =>
    JSON.stringify(
      step.scopeStack
        .filter(({ stepId }) => stepId === 'process_repos' || stepId === 'process_services')
        .map(({ stepId, nestedScopes }) => ({
          stepId,
          scopeIds: nestedScopes.map(({ scopeId }) => scopeId).filter(Boolean),
        }))
    );
  const identityByIteration = new Map<string, { repository?: string; service?: string }>();
  for (const step of steps) {
    const repository = getRepository(step);
    const service = getServiceName(step);
    if (repository || service) identityByIteration.set(iterationKey(step), { repository, service });
  }
  const getIdentity = (
    step: WorkflowStepExecutionDto
  ): { repository?: string; service?: string } => ({
    ...identityByIteration.get(iterationKey(step)),
    ...(getRepository(step) ? { repository: getRepository(step) } : {}),
    ...(getServiceName(step) ? { service: getServiceName(step) } : {}),
  });
  const repositorySteps = steps.filter((step) => getIdentity(step).repository);
  for (const step of repositorySteps) repositoryNames.add(getIdentity(step).repository!);
  const repositories = [...repositoryNames].sort();
  details.progress.repositoriesTotal = repositoryNames.size;
  details.progress.repositoriesStarted = new Set(
    repositorySteps.map((step) => getIdentity(step).repository)
  ).size;

  const discoveredByRepository = new Map<string, Set<string>>();
  for (const discoveryStep of latestByKey(
    steps.filter((step) => step.stepId === 'discover_services' && isSuccessful(step)),
    (candidate) => getRepository(candidate) ?? ''
  )) {
    const repository = getRepository(discoveryStep);
    const output = isRecord(discoveryStep.output) ? discoveryStep.output : {};
    const services = Array.isArray(output.services) ? output.services : [];
    if (!repository) continue;
    const names = discoveredByRepository.get(repository) ?? new Set<string>();
    for (const service of services)
      if (isRecord(service) && asString(service.name)) names.add(asString(service.name)!);
    discoveredByRepository.set(repository, names);
  }

  const serviceKey = (step: WorkflowStepExecutionDto): string => {
    const { repository, service } = getIdentity(step);
    return `${repository ?? ''}:${service ?? ''}`;
  };
  const serviceSteps = latestByKey(
    steps.filter((step) =>
      ['identify_service', 'identify_service_with_wrappers', 'identify_otel_signals'].includes(
        step.stepId
      )
    ),
    (step) => `${serviceKey(step)}:${step.stepId}`
  );
  const outcomesByService = new Map<string, Map<string, WorkflowStepExecutionDto>>();
  for (const step of serviceSteps) {
    const outcomes = outcomesByService.get(serviceKey(step)) ?? new Map();
    outcomes.set(step.stepId, step);
    outcomesByService.set(serviceKey(step), outcomes);
    if (!isSuccessful(step)) continue;
    const output = isRecord(step.output) ? step.output : {};
    details.totals.loggingSitesFound += asNumber(output.loggingSitesFound);
    details.totals.featuresPersisted += asNumber(output.featuresPersisted);
    details.totals.queriesGenerated += asNumber(output.queriesGenerated);
    details.totals.otelSignalsFound += asNumber(output.otelSignalsFound);
  }
  const completedServices = new Set<string>();
  const failedServices = new Set<string>();
  for (const [key, outcomes] of outcomesByService) {
    const identify = outcomes.get('identify_service');
    const identifyWithWrappers = outcomes.get('identify_service_with_wrappers');
    const identifyOtel = outcomes.get('identify_otel_signals');
    if (!identify) continue;

    const identifyFailed = [ExecutionStatus.FAILED, ExecutionStatus.TIMED_OUT].includes(
      identify.status
    );
    if (identifyFailed) {
      failedServices.add(key);
      continue;
    }
    if (!isSuccessful(identify)) continue;

    const body = getBody(identify);
    if (body.hasOtel === true) {
      if (
        identifyOtel &&
        [ExecutionStatus.FAILED, ExecutionStatus.TIMED_OUT].includes(identifyOtel.status)
      ) {
        failedServices.add(key);
      } else if (identifyOtel && isSuccessful(identifyOtel)) {
        completedServices.add(key);
      }
      continue;
    }

    const output = isRecord(identify.output) ? identify.output : {};
    if (asNumber(output.loggingSitesFound) > 0) {
      completedServices.add(key);
    } else if (
      identifyWithWrappers &&
      [ExecutionStatus.FAILED, ExecutionStatus.TIMED_OUT].includes(identifyWithWrappers.status)
    ) {
      failedServices.add(key);
    } else if (identifyWithWrappers && isSuccessful(identifyWithWrappers)) {
      completedServices.add(key);
    }
  }
  details.progress.servicesDiscovered = [...discoveredByRepository.values()].reduce(
    (total, services) => total + services.size,
    0
  );
  details.progress.servicesCompleted = completedServices.size;
  details.progress.servicesFailed = failedServices.size;
  details.totals.wrapperInvestigations = latestByKey(
    steps.filter((step) => step.stepId === 'run_logging_wrappers_agent'),
    (step) => {
      const { repository, service } = getIdentity(step);
      return `${repository ?? ''}:${service ?? ''}:${scopeKey(step)}`;
    }
  ).length;

  for (const step of steps) {
    if (step.stepId in details.timings)
      details.timings[step.stepId as TimingStepId] += asNumber(step.executionTimeMs);
  }
  const failureKey = (step: WorkflowStepExecutionDto): string => {
    const { repository, service } = getIdentity(step);
    return `${repository ?? ''}:${service ?? ''}:${step.stepId}`;
  };
  // Filter after selecting the latest outcome so a successful retry removes an
  // earlier failure from the status response.
  const failures = latestByKey(steps, failureKey)
    .filter((step) => [ExecutionStatus.FAILED, ExecutionStatus.TIMED_OUT].includes(step.status))
    .sort((a, b) => stepOrder(b) - stepOrder(a))
    .slice(0, MAX_RECENT_FAILURES);
  details.recentFailures = failures.map((step) => {
    const key = failureKey(step);
    const attempts = steps.filter(
      (candidate) => candidate.stepType !== 'retry' && failureKey(candidate) === key
    ).length;
    return {
      repository: getIdentity(step).repository,
      service: getIdentity(step).service,
      step: step.stepId as CodeExtractionStepId,
      attempts: Math.max(1, attempts),
      error: asString(step.error?.message) ?? 'Unknown error',
    };
  });

  const repositorySummaries: CodeExtractionRunDetails['perRepository'] = [];
  for (const repository of repositories) {
    const services = discoveredByRepository.get(repository) ?? new Set<string>();
    const serviceKeys = [...services].map((service) => `${repository}:${service}`);
    const currentForRepository = repositorySteps.filter(
      (step) => getIdentity(step).repository === repository
    );
    const discovery = latestByKey(
      steps.filter(
        (step) => step.stepId === 'discover_services' && getRepository(step) === repository
      ),
      (step) => scopeKey(step)
    )[0];
    const failuresForRepository = serviceKeys.filter((key) => failedServices.has(key)).length;
    const completedForRepository = serviceKeys.filter((key) => completedServices.has(key)).length;
    repositorySummaries.push({
      repository,
      servicesDiscovered: services.size,
      servicesCompleted: completedForRepository,
      servicesFailed: failuresForRepository,
      status:
        failuresForRepository > 0 ||
        [ExecutionStatus.FAILED, ExecutionStatus.TIMED_OUT].includes(discovery?.status)
          ? 'failed'
          : discovery !== undefined &&
            isSuccessful(discovery) &&
            (services.size === 0 || completedForRepository >= services.size)
          ? 'completed'
          : currentForRepository.some(isActive)
          ? 'running'
          : 'pending',
    });
  }
  details.progress.repositoriesCompleted = repositorySummaries.filter(
    ({ status }) => status === 'completed'
  ).length;
  details.perRepository = repositorySummaries.slice(0, MAX_REPOSITORIES);

  const current = steps.filter(isActive).sort((a, b) => stepOrder(b) - stepOrder(a))[0];
  if (current && stepIds.has(current.stepId as CodeExtractionStepId)) {
    details.current = {
      phase: phaseFor(current.stepId as CodeExtractionStepId),
      step: current.stepId as CodeExtractionStepId,
      ...(getIdentity(current).repository ? { repository: getIdentity(current).repository } : {}),
      ...(getIdentity(current).service ? { service: getIdentity(current).service } : {}),
      attempt: current.stepExecutionIndex + 1,
      ...(current.startedAt ? { stepStartedAt: current.startedAt } : {}),
    };
  }
  return details;
};
