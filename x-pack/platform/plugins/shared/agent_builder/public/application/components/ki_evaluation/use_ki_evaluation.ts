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
  type GetTracingProjectsResponse,
  type GetProjectTracesResponse,
  type TracingProject,
  type TraceSummary,
  type EvaluateResponse,
  type ListEvaluatorsResponse,
  type IngestScoresRequestBodyInput,
  type GetEvaluationExperimentScoresResponse,
  type EvaluateRequestBodyInput,
} from '@kbn/evals-common';
import { useKibana } from '../../hooks/use_kibana';

const MAX_TRACES_PER_PAGE = 100;

export type EvalStep = 'projects' | 'traces' | 'evaluate' | 'results';

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
  selectedProject?: TracingProject;
  validatedTraces: ValidatedTrace[];
  evaluators: ListEvaluatorsResponse['evaluators'];
  connectorId?: string;
  evaluationResults: EvaluatorScore[];
  experimentId?: string;
  experimentScores: GetEvaluationExperimentScoresResponse['scores'];
  isLoading: boolean;
  error?: string;
  progressMessage?: string;
}

export const useKiEvaluation = () => {
  const {
    services: { http },
  } = useKibana();

  const [state, setState] = useState<KiEvaluationState>({
    currentStep: 'projects',
    projects: [],
    validatedTraces: [],
    evaluators: [],
    evaluationResults: [],
    experimentScores: [],
    isLoading: false,
  });

  const setPartialState = useCallback(
    (partial: Partial<KiEvaluationState>) => setState((prev) => ({ ...prev, ...partial })),
    []
  );

  const fetchProjects = useCallback(async () => {
    setPartialState({
      isLoading: true,
      error: undefined,
      progressMessage: 'Fetching tracing projects...',
    });
    try {
      const response = await http!.get<GetTracingProjectsResponse>(EVALS_TRACING_PROJECTS_URL, {
        version: API_VERSIONS.internal.v1,
      });
      setPartialState({
        projects: response.projects,
        isLoading: false,
        progressMessage: undefined,
      });
    } catch (e) {
      setPartialState({
        isLoading: false,
        error: `Failed to fetch projects: ${e.message ?? e}`,
        progressMessage: undefined,
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

  const selectProject = useCallback(
    async (project: TracingProject) => {
      setPartialState({
        selectedProject: project,
        currentStep: 'traces',
        isLoading: true,
        error: undefined,
        progressMessage: `Fetching traces from "${project.name}"...`,
      });
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
          return {
            trace,
            validation,
            selected: validation.valid,
          };
        });
        setPartialState({
          validatedTraces: validated,
          isLoading: false,
          progressMessage: undefined,
        });
      } catch (e) {
        setPartialState({
          isLoading: false,
          error: `Failed to fetch traces: ${e.message ?? e}`,
          progressMessage: undefined,
        });
      }
    },
    [http, setPartialState]
  );

  const toggleTraceSelection = useCallback((traceId: string) => {
    setState((prev) => ({
      ...prev,
      validatedTraces: prev.validatedTraces.map((vt) =>
        vt.trace.trace_id === traceId && vt.validation.valid
          ? { ...vt, selected: !vt.selected }
          : vt
      ),
    }));
  }, []);

  const toggleAllTraces = useCallback((selected: boolean) => {
    setState((prev) => ({
      ...prev,
      validatedTraces: prev.validatedTraces.map((vt) =>
        vt.validation.valid ? { ...vt, selected } : vt
      ),
    }));
  }, []);

  const runEvaluation = useCallback(
    async (connectorId: string) => {
      const selectedTraces = state.validatedTraces.filter((vt) => vt.selected);

      setPartialState({
        currentStep: 'evaluate',
        connectorId,
        isLoading: true,
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
          const evaluators: EvaluateRequestBodyInput['evaluators'] = [
            { name: 'latency' },
            { name: 'input_tokens' },
            { name: 'output_tokens' },
            { name: 'tool_calls' },
          ];

          if (validation.hasChatEvents) {
            evaluators.unshift({ name: 'groundedness', connector_id: connectorId });
          }

          const body: EvaluateRequestBodyInput = {
            subject: {
              mode: 'single-turn',
              traces: [{ trace_id: trace.trace_id }],
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
          isLoading: false,
          progressMessage: undefined,
          currentStep: 'results',
        });
      } catch (e) {
        setPartialState({
          isLoading: false,
          error: `Scores ingested but experiment creation failed: ${e.message ?? e}`,
          progressMessage: undefined,
          currentStep: 'results',
          evaluationResults: allResults,
        });
      }
    },
    [http, state.validatedTraces, setPartialState]
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
      currentStep: 'projects',
      projects: [],
      validatedTraces: [],
      evaluators: [],
      evaluationResults: [],
      experimentScores: [],
      isLoading: false,
    });
  }, []);

  const selectedCount = state.validatedTraces.filter((vt) => vt.selected).length;

  return {
    state,
    selectedCount,
    fetchProjects,
    fetchEvaluators,
    selectProject,
    toggleTraceSelection,
    toggleAllTraces,
    runEvaluation,
    fetchExperimentScores,
    reset,
  };
};
