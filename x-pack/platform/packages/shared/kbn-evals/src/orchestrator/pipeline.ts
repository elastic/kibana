/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RanExperiment,
  EvalsExecutorClient,
  Evaluator,
  EvaluationDataset,
  ExperimentTask,
  Example,
  TaskOutput,
  ImprovementSuggestionAnalysisResult,
  ImprovementSuggestion,
  EvalTraceCorrelation,
} from '../types';
import type { ImprovementAnalyzer } from '../utils/improvement_analyzer';

/**
 * Enumeration of pipeline step identifiers.
 */
export type PipelineStepId = 'eval' | 'trace-collect' | 'analyze' | 'suggest' | 'report';

/**
 * Status of a pipeline step execution.
 */
export type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';

/**
 * Result of a single pipeline step execution.
 */
export interface PipelineStepResult<T = unknown> {
  /** Step identifier */
  stepId: PipelineStepId;
  /** Execution status */
  status: PipelineStepStatus;
  /** Output data from the step */
  output?: T;
  /** Error if the step failed */
  error?: Error;
  /** Timestamp when the step started */
  startedAt: string;
  /** Timestamp when the step completed */
  completedAt?: string;
  /** Duration in milliseconds */
  durationMs?: number;
}

/**
 * Output from the eval step.
 */
export interface EvalStepOutput {
  /** The ran experiment with evaluation results */
  experiment: RanExperiment;
  /** Mean score across all evaluators */
  meanScore: number;
}

/**
 * Output from the trace-collect step.
 */
export interface TraceCollectStepOutput {
  /** Correlations between evaluation runs and traces */
  correlations: EvalTraceCorrelation[];
  /** Count of traces successfully collected */
  successCount: number;
  /** Count of traces that failed to collect */
  failureCount: number;
}

/**
 * Output from the analyze step.
 */
export interface AnalyzeStepOutput {
  /** Analysis results including pattern detection */
  analysis: ImprovementSuggestionAnalysisResult;
}

/**
 * Output from the suggest step.
 */
export interface SuggestStepOutput {
  /** Prioritized list of improvement suggestions */
  suggestions: ImprovementSuggestion[];
  /** Summary statistics */
  suggestionCount: number;
  /** High-impact suggestions count */
  highImpactCount: number;
}

/**
 * Output from the report step.
 */
export interface ReportStepOutput {
  /** Whether the report was generated successfully */
  reported: boolean;
  /** Optional report data or path */
  reportData?: unknown;
}

/**
 * Context passed through the pipeline, accumulating results from each step.
 */
export interface PipelineContext<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
> {
  /** Input dataset */
  dataset: EvaluationDataset<TExample>;
  /** Task function to evaluate */
  task: ExperimentTask<TExample, TTaskOutput>;
  /** Evaluators to use */
  evaluators: Array<Evaluator<TExample, TTaskOutput>>;
  /** Optional metadata for the experiment */
  metadata?: Record<string, unknown>;
  /** Optional model identifier */
  model?: string;
  /** Step results accumulated during execution */
  stepResults: Map<PipelineStepId, PipelineStepResult>;
  /** Eval step output (populated after eval step) */
  evalOutput?: EvalStepOutput;
  /** Trace collect output (populated after trace-collect step) */
  traceCollectOutput?: TraceCollectStepOutput;
  /** Analyze output (populated after analyze step) */
  analyzeOutput?: AnalyzeStepOutput;
  /** Suggest output (populated after suggest step) */
  suggestOutput?: SuggestStepOutput;
  /** Report output (populated after report step) */
  reportOutput?: ReportStepOutput;
}

/**
 * Definition of a pipeline step with its execution logic.
 */
export interface PipelineStep<
  TInput = unknown,
  TOutput = unknown,
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
> {
  /** Unique step identifier */
  id: PipelineStepId;
  /** Human-readable step name */
  name: string;
  /** Step description */
  description: string;
  /** Dependencies on other steps (must complete before this step) */
  dependsOn: PipelineStepId[];
  /** Whether this step can be skipped */
  optional: boolean;
  /** Execute the step */
  execute: (context: PipelineContext<TExample, TTaskOutput>, input: TInput) => Promise<TOutput>;
}

/**
 * Configuration for creating a pipeline.
 */
export interface PipelineConfig {
  /** Executor client for running experiments */
  executorClient: EvalsExecutorClient;
  /** Improvement analyzer for analysis and suggestions */
  improvementAnalyzer?: ImprovementAnalyzer;
  /** Custom trace collector function */
  traceCollector?: (experiment: RanExperiment) => Promise<EvalTraceCorrelation[]>;
  /** Custom reporter function */
  reporter?: (context: PipelineContext) => Promise<void>;
  /** Concurrency for running experiments */
  concurrency?: number;
  /** Steps to skip */
  skipSteps?: PipelineStepId[];
  /** Callback invoked before each step */
  onStepStart?: (stepId: PipelineStepId) => void;
  /** Callback invoked after each step completes */
  onStepComplete?: (result: PipelineStepResult) => void;
  /** Callback invoked when a step fails */
  onStepError?: (stepId: PipelineStepId, error: Error) => void;
}

/**
 * Result of a complete pipeline run.
 */
export interface PipelineResult<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
> {
  /** Whether the pipeline completed successfully */
  success: boolean;
  /** Final pipeline context with all accumulated results */
  context: PipelineContext<TExample, TTaskOutput>;
  /** All step results in execution order */
  stepResults: PipelineStepResult[];
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Timestamp when the pipeline started */
  startedAt: string;
  /** Timestamp when the pipeline completed */
  completedAt: string;
  /** Error if the pipeline failed */
  error?: Error;
}

/**
 * Pipeline controller for managing execution.
 */
export interface PipelineController<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
> {
  /** Promise that resolves when the pipeline completes */
  result: Promise<PipelineResult<TExample, TTaskOutput>>;
  /** Request the pipeline to stop after the current step */
  stop: () => void;
  /** Check if the pipeline has been requested to stop */
  isStopping: () => boolean;
  /** Get the current step being executed */
  getCurrentStep: () => PipelineStepId | null;
}

/**
 * Pipeline instance with execution methods.
 */
export interface Pipeline {
  /** Run the complete pipeline */
  run: <TExample extends Example = Example, TTaskOutput extends TaskOutput = TaskOutput>(
    input: PipelineInput<TExample, TTaskOutput>
  ) => PipelineController<TExample, TTaskOutput>;
  /** Run a single step */
  runStep: <TExample extends Example = Example, TTaskOutput extends TaskOutput = TaskOutput>(
    stepId: PipelineStepId,
    context: PipelineContext<TExample, TTaskOutput>
  ) => Promise<PipelineStepResult>;
  /** Get step definitions */
  getSteps: () => PipelineStep[];
  /** Get step order */
  getStepOrder: () => PipelineStepId[];
}

/**
 * Input for starting a pipeline run.
 */
export interface PipelineInput<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
> {
  /** The dataset to evaluate */
  dataset: EvaluationDataset<TExample>;
  /** The task function to evaluate */
  task: ExperimentTask<TExample, TTaskOutput>;
  /** Evaluators to use */
  evaluators: Array<Evaluator<TExample, TTaskOutput>>;
  /** Optional metadata for the experiment */
  metadata?: Record<string, unknown>;
  /** Optional model identifier */
  model?: string;
  /** Optional additional context for analysis */
  additionalContext?: string;
}

/**
 * The canonical pipeline step order.
 */
export const PIPELINE_STEP_ORDER: PipelineStepId[] = [
  'eval',
  'trace-collect',
  'analyze',
  'suggest',
  'report',
];

/**
 * Creates an evaluation pipeline with the standard step sequence:
 * eval → trace-collect → analyze → suggest → report
 *
 * @param config - Pipeline configuration
 * @returns Pipeline instance
 */
export function createPipeline(config: PipelineConfig): Pipeline {
  const {
    executorClient,
    improvementAnalyzer,
    traceCollector,
    reporter,
    concurrency = 1,
    skipSteps = [],
    onStepStart,
    onStepComplete,
    onStepError,
  } = config;

  /**
   * Calculates the mean score from an experiment's evaluation runs.
   */
  function calculateMeanScore(experiment: RanExperiment): number {
    const { evaluationRuns } = experiment;

    if (!evaluationRuns || evaluationRuns.length === 0) {
      return 0;
    }

    const scores = evaluationRuns
      .map((evalRun) => evalRun.result?.score)
      .filter((score): score is number => typeof score === 'number');

    if (scores.length === 0) {
      return 0;
    }

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Default trace collector implementation.
   * Returns empty correlations - implement custom collector for actual trace data.
   */
  async function defaultTraceCollector(experiment: RanExperiment): Promise<EvalTraceCorrelation[]> {
    const correlations: EvalTraceCorrelation[] = [];
    const { runs, evaluationRuns } = experiment;

    if (!runs) {
      return correlations;
    }

    for (const [runKey, runData] of Object.entries(runs)) {
      const evalResults: Record<
        string,
        { score?: number | null; label?: string | null; explanation?: string }
      > = {};

      if (evaluationRuns) {
        evaluationRuns
          .filter((er) => er.runKey === runKey || er.exampleIndex === runData.exampleIndex)
          .forEach((er) => {
            evalResults[er.name] = er.result || {};
          });
      }

      correlations.push({
        traceId: runData.evalThreadId || `trace-${runKey}`,
        exampleIndex: runData.exampleIndex,
        repetition: runData.repetition,
        runKey,
        input: runData.input,
        expected: runData.expected,
        output: runData.output,
        evaluationResults: evalResults,
      });
    }

    return correlations;
  }

  /**
   * Step definitions for the pipeline.
   */
  const steps: PipelineStep[] = [
    {
      id: 'eval',
      name: 'Evaluation',
      description: 'Run the task against the dataset and apply evaluators',
      dependsOn: [],
      optional: false,
      execute: async (context) => {
        const experiment = await executorClient.runExperiment(
          {
            dataset: context.dataset,
            task: context.task,
            metadata: context.metadata,
            concurrency,
          },
          context.evaluators
        );

        const meanScore = calculateMeanScore(experiment);

        const output: EvalStepOutput = { experiment, meanScore };
        context.evalOutput = output;
        return output;
      },
    },
    {
      id: 'trace-collect',
      name: 'Trace Collection',
      description: 'Collect trace data for evaluation runs',
      dependsOn: ['eval'],
      optional: true,
      execute: async (context) => {
        if (!context.evalOutput) {
          throw new Error('Eval step must complete before trace-collect');
        }

        const collector = traceCollector || defaultTraceCollector;
        const correlations = await collector(context.evalOutput.experiment);

        const successCount = correlations.filter((c) => !c.traceError).length;
        const failureCount = correlations.filter((c) => c.traceError).length;

        const output: TraceCollectStepOutput = { correlations, successCount, failureCount };
        context.traceCollectOutput = output;
        return output;
      },
    },
    {
      id: 'analyze',
      name: 'Analysis',
      description: 'Analyze evaluation results to identify patterns and issues',
      dependsOn: ['eval'],
      optional: true,
      execute: async (context, input: { additionalContext?: string } = {}) => {
        if (!context.evalOutput) {
          throw new Error('Eval step must complete before analyze');
        }

        if (!improvementAnalyzer) {
          // Return empty analysis if no analyzer configured
          const emptyAnalysis: ImprovementSuggestionAnalysisResult = {
            suggestions: [],
            summary: {
              totalSuggestions: 0,
              byImpact: { high: 0, medium: 0, low: 0 },
              byCategory: {
                prompt: 0,
                tool_selection: 0,
                response_quality: 0,
                context_retrieval: 0,
                reasoning: 0,
                accuracy: 0,
                efficiency: 0,
                other: 0,
              },
              topPriority: [],
            },
            metadata: {
              runId: context.evalOutput.experiment.id,
              datasetName: context.evalOutput.experiment.datasetName,
              model: context.model,
              analyzedAt: new Date().toISOString(),
            },
          };
          const output: AnalyzeStepOutput = { analysis: emptyAnalysis };
          context.analyzeOutput = output;
          return output;
        }

        const analysis = await improvementAnalyzer.analyze({
          experiment: context.evalOutput.experiment,
          model: context.model,
          additionalContext: input.additionalContext,
        });

        const output: AnalyzeStepOutput = { analysis };
        context.analyzeOutput = output;
        return output;
      },
    },
    {
      id: 'suggest',
      name: 'Suggestions',
      description: 'Generate prioritized improvement suggestions',
      dependsOn: ['analyze'],
      optional: true,
      execute: async (context) => {
        if (!context.analyzeOutput) {
          throw new Error('Analyze step must complete before suggest');
        }

        const { suggestions } = context.analyzeOutput.analysis;

        // Sort suggestions by priority score
        const sortedSuggestions = [...suggestions].sort(
          (a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)
        );

        const highImpactCount = sortedSuggestions.filter((s) => s.impact === 'high').length;

        const output: SuggestStepOutput = {
          suggestions: sortedSuggestions,
          suggestionCount: sortedSuggestions.length,
          highImpactCount,
        };
        context.suggestOutput = output;
        return output;
      },
    },
    {
      id: 'report',
      name: 'Reporting',
      description: 'Generate evaluation report',
      dependsOn: ['eval'],
      optional: true,
      execute: async (context) => {
        if (reporter) {
          await reporter(context);
        }

        const output: ReportStepOutput = { reported: true };
        context.reportOutput = output;
        return output;
      },
    },
  ];

  /**
   * Creates an initial pipeline context.
   */
  function createContext<TExample extends Example, TTaskOutput extends TaskOutput>(
    input: PipelineInput<TExample, TTaskOutput>
  ): PipelineContext<TExample, TTaskOutput> {
    return {
      dataset: input.dataset,
      task: input.task,
      evaluators: input.evaluators,
      metadata: input.metadata,
      model: input.model,
      stepResults: new Map(),
    };
  }

  /**
   * Executes a single pipeline step.
   */
  async function executeStep<TExample extends Example, TTaskOutput extends TaskOutput>(
    step: PipelineStep,
    context: PipelineContext<TExample, TTaskOutput>,
    stepInput?: unknown
  ): Promise<PipelineStepResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    // Check if step should be skipped
    if (skipSteps.includes(step.id)) {
      const result: PipelineStepResult = {
        stepId: step.id,
        status: 'skipped',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: 0,
      };
      context.stepResults.set(step.id, result);
      return result;
    }

    // Check dependencies
    for (const depId of step.dependsOn) {
      const depResult = context.stepResults.get(depId);
      if (!depResult || (depResult.status !== 'completed' && depResult.status !== 'skipped')) {
        throw new Error(`Step '${step.id}' requires '${depId}' to complete first`);
      }
    }

    if (onStepStart) {
      onStepStart(step.id);
    }

    try {
      const output = await step.execute(context, stepInput);

      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      const result: PipelineStepResult = {
        stepId: step.id,
        status: 'completed',
        output,
        startedAt,
        completedAt,
        durationMs,
      };

      context.stepResults.set(step.id, result);

      if (onStepComplete) {
        onStepComplete(result);
      }

      return result;
    } catch (error) {
      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      const result: PipelineStepResult = {
        stepId: step.id,
        status: 'failed',
        error: err,
        startedAt,
        completedAt,
        durationMs,
      };

      context.stepResults.set(step.id, result);

      if (onStepError) {
        onStepError(step.id, err);
      }

      throw err;
    }
  }

  /**
   * Runs a single step by ID.
   */
  async function runStep<TExample extends Example, TTaskOutput extends TaskOutput>(
    stepId: PipelineStepId,
    context: PipelineContext<TExample, TTaskOutput>
  ): Promise<PipelineStepResult> {
    const step = steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error(`Unknown step: ${stepId}`);
    }
    return executeStep(step, context);
  }

  /**
   * Runs the complete pipeline.
   */
  function run<TExample extends Example, TTaskOutput extends TaskOutput>(
    input: PipelineInput<TExample, TTaskOutput>
  ): PipelineController<TExample, TTaskOutput> {
    let stopRequested = false;
    let currentStep: PipelineStepId | null = null;

    const stop = () => {
      stopRequested = true;
    };

    const isStopping = () => stopRequested;

    const getCurrentStep = () => currentStep;

    const result = (async (): Promise<PipelineResult<TExample, TTaskOutput>> => {
      const startedAt = new Date().toISOString();
      const startTime = Date.now();
      const context = createContext(input);
      const stepResults: PipelineStepResult[] = [];

      try {
        for (const stepId of PIPELINE_STEP_ORDER) {
          if (stopRequested) {
            break;
          }

          currentStep = stepId;
          const step = steps.find((s) => s.id === stepId);

          if (!step) {
            continue;
          }

          try {
            const additionalInput =
              stepId === 'analyze' ? { additionalContext: input.additionalContext } : undefined;
            const stepResult = await executeStep(step, context, additionalInput);
            stepResults.push(stepResult);
          } catch (error) {
            // If step is optional, continue; otherwise, fail the pipeline
            if (step.optional) {
              const stepResult = context.stepResults.get(stepId);
              if (stepResult) {
                stepResults.push(stepResult);
              }
            } else {
              throw error;
            }
          }
        }

        currentStep = null;
        const completedAt = new Date().toISOString();
        const totalDurationMs = Date.now() - startTime;

        return {
          success: true,
          context,
          stepResults,
          totalDurationMs,
          startedAt,
          completedAt,
        };
      } catch (error) {
        currentStep = null;
        const completedAt = new Date().toISOString();
        const totalDurationMs = Date.now() - startTime;
        const err = error instanceof Error ? error : new Error(String(error));

        return {
          success: false,
          context,
          stepResults,
          totalDurationMs,
          startedAt,
          completedAt,
          error: err,
        };
      }
    })();

    return {
      result,
      stop,
      isStopping,
      getCurrentStep,
    };
  }

  return {
    run,
    runStep,
    getSteps: () => [...steps],
    getStepOrder: () => [...PIPELINE_STEP_ORDER],
  };
}

/**
 * Type for the pipeline instance.
 */
export type EvaluationPipeline = ReturnType<typeof createPipeline>;
