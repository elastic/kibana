/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import {
  API_VERSIONS,
  EVALS_TRACING_PROJECTS_URL,
  EVALS_TRACING_PROJECT_TRACES_URL,
  EVALS_EVALUATE_URL,
  EVALS_SCORES_URL,
  EVALS_EVALUATORS_URL,
  EVALS_EXPERIMENT_SCORES_URL,
  EVALS_VALIDATE_URL,
  EVALS_RESOLVE_MAPPINGS_URL,
  type GetTracingProjectsResponse,
  type GetProjectTracesResponse,
  type TracingProject,
  type TraceSummary,
  type EvaluateResponse,
  type ListEvaluatorsResponse,
  type IngestScoresRequestBodyInput,
  type GetEvaluationExperimentScoresResponse,
  type EvaluateRequestBodyInput,
  type ValidateResponse,
  type ValidateRequestBodyInput,
  type ResolveMappingsResponse,
  type ResolveMappingsRequestBodyInput,
} from '@kbn/evals-common';
import { useKibana } from '../../hooks/use_kibana';

const MAX_TRACES_PER_PAGE = 100;

export type EvalStep = 'traces' | 'reference_data' | 'results';

export interface TraceValidation {
  valid: boolean;
  hasSpans: boolean;
  hasTokenData: boolean;
  hasChatEvents: boolean;
  warnings: string[];
}

export interface ValidatedTrace {
  trace: TraceSummary;
  validation: TraceValidation;
  selected: boolean;
}

export interface ProjectTracesState {
  traces: ValidatedTrace[];
  isLoading: boolean;
  error?: string;
}

export const validateTrace = (trace: TraceSummary): TraceValidation => {
  const warnings: string[] = [];
  const hasSpans = (trace.total_spans ?? 0) > 0;
  const hasTokenData = (trace.tokens?.total ?? 0) > 0;
  const hasChatEvents = Boolean(trace.user_prompt);

  if (!hasSpans) {
    warnings.push('No spans found — all evaluators will fail.');
  }
  if (!hasChatEvents) {
    warnings.push(
      'No chat data in logs — LLM evaluators (groundedness) will be skipped. Enable private data in tracing config.'
    );
  }
  if (!hasTokenData) {
    warnings.push('No token usage data — token evaluators may return unavailable.');
  }

  return {
    valid: hasSpans,
    hasSpans,
    hasTokenData,
    hasChatEvents,
    warnings,
  };
};

interface EvaluatorScore {
  traceId: string;
  traceName: string;
  evaluatorName: string;
  evaluatorKind: 'llm' | 'code';
  score?: number | null;
  label?: string;
  explanation?: string;
  status: 'ok' | 'error';
  errorMessage?: string;
}

export interface KiEvaluationState {
  currentStep: EvalStep;
  projects: TracingProject[];
  projectsLoading: boolean;
  tracesByProject: Record<string, ProjectTracesState>;
  evaluators: ListEvaluatorsResponse['evaluators'];
  connectorId?: string;
  /** Per-trace ground-truth data keyed by trace_id. Used by evaluators that declare reference_data_schema (e.g. correctness). */
  traceReferenceData: Record<string, Record<string, string>>;
  evaluationResults: EvaluatorScore[];
  experimentId?: string;
  experimentScores: GetEvaluationExperimentScoresResponse['scores'];
  isRunning: boolean;
  error?: string;
  progressMessage?: string;
  /** Per-trace validation results keyed by trace_id. Contains evaluator readiness and remediation hints. */
  traceValidations: Record<string, ValidateResponse>;
  /** Per-trace detected profiles and recommended profile keyed by trace_id. */
  traceProfiles: Record<string, ResolveMappingsResponse>;
  /** Set of trace IDs currently being validated. */
  validatingTraces: Set<string>;
}

export const useKiEvaluation = () => {
  const {
    services: { http },
  } = useKibana();

  const [state, setState] = useState<KiEvaluationState>({
    currentStep: 'traces',
    projects: [],
    projectsLoading: false,
    tracesByProject: {},
    evaluators: [],
    traceReferenceData: {},
    evaluationResults: [],
    experimentScores: [],
    isRunning: false,
    traceValidations: {},
    traceProfiles: {},
    validatingTraces: new Set(),
  });

  const setPartialState = useCallback(
    (partial: Partial<KiEvaluationState>) => setState((prev) => ({ ...prev, ...partial })),
    []
  );

  const fetchProjects = useCallback(async () => {
    setPartialState({ projectsLoading: true, error: undefined });
    try {
      const response = await http!.get<GetTracingProjectsResponse>(EVALS_TRACING_PROJECTS_URL, {
        version: API_VERSIONS.internal.v1,
      });
      setPartialState({ projects: response.projects, projectsLoading: false });
    } catch (e) {
      setPartialState({
        projectsLoading: false,
        error: `Failed to fetch projects: ${e.message ?? e}`,
      });
    }
  }, [http, setPartialState]);

  const fetchEvaluators = useCallback(async () => {
    try {
      const response = await http!.get<ListEvaluatorsResponse>(EVALS_EVALUATORS_URL, {
        version: API_VERSIONS.internal.v1,
      });
      setPartialState({ evaluators: response.evaluators });
    } catch {
      // non-blocking
    }
  }, [http, setPartialState]);

  const loadProjectTraces = useCallback(
    async (project: TracingProject) => {
      const alreadyLoaded = state.tracesByProject[project.name];
      if (alreadyLoaded?.traces.length > 0 || alreadyLoaded?.isLoading) return;

      setState((prev) => ({
        ...prev,
        tracesByProject: {
          ...prev.tracesByProject,
          [project.name]: { traces: [], isLoading: true },
        },
      }));

      try {
        const url = EVALS_TRACING_PROJECT_TRACES_URL.replace(
          '{projectName}',
          encodeURIComponent(project.name)
        );
        const response = await http!.get<GetProjectTracesResponse>(url, {
          version: API_VERSIONS.internal.v1,
          query: { per_page: MAX_TRACES_PER_PAGE },
        });

        const validated = response.traces.map((trace) => {
          const validation = validateTrace(trace);
          return { trace, validation, selected: false };
        });

        setState((prev) => ({
          ...prev,
          tracesByProject: {
            ...prev.tracesByProject,
            [project.name]: { traces: validated, isLoading: false },
          },
        }));
      } catch (e) {
        setState((prev) => ({
          ...prev,
          tracesByProject: {
            ...prev.tracesByProject,
            [project.name]: {
              traces: [],
              isLoading: false,
              error: `Failed to fetch traces: ${e.message ?? e}`,
            },
          },
        }));
      }
    },
    [http, state.tracesByProject]
  );

  const toggleTraceSelection = useCallback((projectName: string, traceId: string) => {
    setState((prev) => {
      const projectTraces = prev.tracesByProject[projectName];
      if (!projectTraces) return prev;

      // Check if trace is currently selected and will be deselected
      const trace = projectTraces.traces.find((vt) => vt.trace.trace_id === traceId);
      const isBeingDeselected = trace?.selected === true;

      // Clear validation for this trace if being deselected
      const newValidations = { ...prev.traceValidations };
      if (isBeingDeselected) {
        delete newValidations[traceId];
      }

      return {
        ...prev,
        tracesByProject: {
          ...prev.tracesByProject,
          [projectName]: {
            ...projectTraces,
            traces: projectTraces.traces.map((vt) =>
              vt.trace.trace_id === traceId && vt.validation.valid
                ? { ...vt, selected: !vt.selected }
                : vt
            ),
          },
        },
        traceValidations: newValidations,
      };
    });
  }, []);

  const toggleAllTracesForProject = useCallback((projectName: string, selected: boolean) => {
    setState((prev) => {
      const projectTraces = prev.tracesByProject[projectName];
      if (!projectTraces) return prev;

      // Get IDs of traces being deselected
      const deselectedTraceIds =
        selected === false
          ? projectTraces.traces
              .filter((vt) => vt.selected && vt.validation.valid)
              .map((vt) => vt.trace.trace_id)
          : [];

      // Clear validations for deselected traces
      const newValidations = { ...prev.traceValidations };
      deselectedTraceIds.forEach((id) => {
        delete newValidations[id];
      });

      return {
        ...prev,
        tracesByProject: {
          ...prev.tracesByProject,
          [projectName]: {
            ...projectTraces,
            traces: projectTraces.traces.map((vt) =>
              vt.validation.valid ? { ...vt, selected } : vt
            ),
          },
        },
        traceValidations: newValidations,
      };
    });
  }, []);

  const goToStep = useCallback(
    (step: EvalStep) => setPartialState({ currentStep: step, error: undefined }),
    [setPartialState]
  );

  const setTraceReferenceData = useCallback((traceId: string, field: string, value: string) => {
    setState((prev) => ({
      ...prev,
      traceReferenceData: {
        ...prev.traceReferenceData,
        [traceId]: { ...(prev.traceReferenceData[traceId] ?? {}), [field]: value },
      },
    }));
  }, []);

  const resolveTraceProfiles = useCallback(
    async (traceIds: string[]): Promise<Record<string, ResolveMappingsResponse>> => {
      const profilesByTraceId: Record<string, ResolveMappingsResponse> = {};

      for (const traceId of traceIds) {
        try {
          const body: ResolveMappingsRequestBodyInput = {
            trace_id: traceId,
          };

          const response = await http!.post<ResolveMappingsResponse>(EVALS_RESOLVE_MAPPINGS_URL, {
            body: JSON.stringify(body),
            version: API_VERSIONS.internal.v1,
          });
          profilesByTraceId[traceId] = response;
        } catch (e) {
          // If profile resolution fails, will fall back to elastic-inference
        }
      }

      return profilesByTraceId;
    },
    [http]
  );

  const validateTracesForEvaluators = useCallback(
    async (traceIds: string[], evaluatorNames: string[]) => {
      if (evaluatorNames.length === 0) {
        return;
      }

      // Mark traces as validating
      setState((prev) => ({
        ...prev,
        validatingTraces: new Set([...prev.validatingTraces, ...traceIds]),
      }));

      try {
        // Resolve profiles if not already done
        let profiles = state.traceProfiles;
        const unprofiledTraces = traceIds.filter((id) => !profiles[id]);
        if (unprofiledTraces.length > 0) {
          const newProfiles = await resolveTraceProfiles(unprofiledTraces);
          profiles = { ...profiles, ...newProfiles };
        }

        // Validate each trace
        const validationsByTraceId: Record<string, ValidateResponse> = {};

        for (const traceId of traceIds) {
          try {
            const recommendedProfile =
              profiles[traceId]?.recommended_mapping?.profile || 'elastic-inference';
            const body: ValidateRequestBodyInput = {
              subject: {
                mode: 'single-turn',
                traces: [{ trace_id: traceId }],
                evidence_mapping: { profile: recommendedProfile as any },
              },
              evaluators: evaluatorNames.map((name) => ({ name })),
            };

            const response = await http!.post<ValidateResponse>(EVALS_VALIDATE_URL, {
              body: JSON.stringify(body),
              version: API_VERSIONS.internal.v1,
            });
            validationsByTraceId[traceId] = response;
          } catch (e) {
            // Validation error for this trace, keep validatingTraces set to show it was attempted
          }
        }

        // Update state with validation results and profiling info
        setState((prev) => ({
          ...prev,
          traceValidations: { ...prev.traceValidations, ...validationsByTraceId },
          traceProfiles: profiles,
          validatingTraces: new Set(
            Array.from(prev.validatingTraces).filter((id) => !traceIds.includes(id))
          ),
        }));
      } catch (e) {
        // Error during validation batch
        setState((prev) => ({
          ...prev,
          validatingTraces: new Set(
            Array.from(prev.validatingTraces).filter((id) => !traceIds.includes(id))
          ),
        }));
      }
    },
    [http, state.traceProfiles, resolveTraceProfiles]
  );

  const runEvaluation = useCallback(
    async (connectorId: string, evaluatorNames: string[]) => {
      const allProjectTraces = Object.values(state.tracesByProject).flatMap((p) => p.traces);
      const selectedTraces = allProjectTraces.filter((vt) => vt.selected);

      // Build a lookup of evaluator kind by name so we know which ones need connector_id.
      const evaluatorKindByName = new Map(state.evaluators.map((e) => [e.name, e.kind] as const));

      setPartialState({
        connectorId,
        isRunning: true,
        error: undefined,
        evaluationResults: [],
        progressMessage: 'Starting evaluation...',
      });

      const allResults: EvaluatorScore[] = [];

      for (let i = 0; i < selectedTraces.length; i++) {
        const { trace, validation } = selectedTraces[i];
        setPartialState({
          progressMessage: `Evaluating trace ${i + 1} of ${selectedTraces.length}: "${
            trace.name
          }"...`,
        });

        try {
          const evaluators: EvaluateRequestBodyInput['evaluators'] = evaluatorNames
            // Skip LLM evaluators when the trace has no chat data (they'd fail anyway).
            .filter((name) => evaluatorKindByName.get(name) !== 'llm' || validation.hasChatEvents)
            .map((name) =>
              evaluatorKindByName.get(name) === 'llm'
                ? { name, connector_id: connectorId }
                : { name }
            );

          const referenceData = state.traceReferenceData[trace.trace_id];
          const recommendedProfile =
            state.traceProfiles[trace.trace_id]?.recommended_mapping?.profile ||
            'elastic-inference';
          const body: EvaluateRequestBodyInput = {
            subject: {
              mode: 'single-turn',
              traces: [
                {
                  trace_id: trace.trace_id,
                  ...(referenceData ? { reference_data: referenceData } : {}),
                },
              ],
              evidence_mapping: { profile: recommendedProfile as any },
            },
            evaluators,
          };

          const response = await http!.post<EvaluateResponse>(EVALS_EVALUATE_URL, {
            body: JSON.stringify(body),
            version: API_VERSIONS.internal.v1,
          });

          for (const result of response.results) {
            if (result.status === 'ok' && result.scores) {
              for (const score of result.scores) {
                allResults.push({
                  traceId: trace.trace_id,
                  traceName: trace.name,
                  evaluatorName: `${result.evaluator.name}/${score.name}`,
                  evaluatorKind: result.evaluator.kind,
                  score: score.score,
                  label: score.label,
                  explanation: score.explanation,
                  status: 'ok',
                });
              }
            } else {
              allResults.push({
                traceId: trace.trace_id,
                traceName: trace.name,
                evaluatorName: result.evaluator.name,
                evaluatorKind: result.evaluator.kind,
                status: 'error',
                errorMessage: result.error?.message,
              });
            }
          }
        } catch (e) {
          allResults.push({
            traceId: trace.trace_id,
            traceName: trace.name,
            evaluatorName: 'all',
            evaluatorKind: 'code',
            status: 'error',
            errorMessage: e.message ?? String(e),
          });
        }
      }

      setPartialState({
        evaluationResults: allResults,
        progressMessage: 'Evaluation complete. Ingesting scores...',
      });

      const experimentId = `ki-eval-${Date.now()}`;
      try {
        const scores: IngestScoresRequestBodyInput['scores'] = allResults
          .filter((r) => r.status === 'ok')
          .map((r, idx) => ({
            example: {
              id: r.traceId,
              index: idx,
              dataset: { id: 'ki-traces', name: 'ki-traces' },
            },
            task: {
              trace_id: r.traceId,
              repetition_index: 0,
            },
            evaluator: {
              name: r.evaluatorName,
              score: r.score ?? null,
              label: r.label ?? null,
              explanation: r.explanation ?? null,
            },
          }));

        if (scores.length > 0) {
          const ingestBody: IngestScoresRequestBodyInput = {
            experiment_id: experimentId,
            experiment_name: 'KI Eval MVP',
            task_model: { id: 'unknown' },
            evaluator_model: { id: connectorId },
            metadata: {
              total_repetitions: 1,
              hostname: 'kibana-ui',
              suite_id: 'ki-context-engine',
            },
            scores,
          };

          await http!.post(EVALS_SCORES_URL, {
            body: JSON.stringify(ingestBody),
            version: API_VERSIONS.internal.v1,
          });
        }

        setPartialState({
          experimentId,
          isRunning: false,
          progressMessage: undefined,
          currentStep: 'results',
        });
      } catch (e) {
        setPartialState({
          isRunning: false,
          error: `Scores ingested but experiment creation failed: ${e.message ?? e}`,
          progressMessage: undefined,
          currentStep: 'results',
          evaluationResults: allResults,
        });
      }
    },
    [
      http,
      state.tracesByProject,
      state.evaluators,
      state.traceReferenceData,
      state.traceProfiles,
      setPartialState,
    ]
  );

  const fetchExperimentScores = useCallback(
    async (experimentId: string) => {
      try {
        const url = EVALS_EXPERIMENT_SCORES_URL.replace(
          '{experimentId}',
          encodeURIComponent(experimentId)
        );
        const response = await http!.get<GetEvaluationExperimentScoresResponse>(url, {
          version: API_VERSIONS.internal.v1,
        });
        setPartialState({ experimentScores: response.scores });
      } catch {
        // non-blocking
      }
    },
    [http, setPartialState]
  );

  const reset = useCallback(() => {
    setState({
      currentStep: 'traces',
      projects: [],
      projectsLoading: false,
      tracesByProject: {},
      evaluators: [],
      traceReferenceData: {},
      evaluationResults: [],
      experimentScores: [],
      isRunning: false,
      traceValidations: {},
      traceProfiles: {},
      validatingTraces: new Set(),
    });
  }, []);

  const selectedCount = Object.values(state.tracesByProject)
    .flatMap((p) => p.traces)
    .filter((vt) => vt.selected).length;

  return {
    state,
    selectedCount,
    fetchProjects,
    fetchEvaluators,
    loadProjectTraces,
    toggleTraceSelection,
    toggleAllTracesForProject,
    runEvaluation,
    fetchExperimentScores,
    goToStep,
    setTraceReferenceData,
    validateTracesForEvaluators,
    reset,
  };
};
