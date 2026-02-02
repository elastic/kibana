/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import objectHash from 'object-hash';
import { omitBy, isEmpty } from 'lodash';
import { randomUUID } from 'crypto';
import { withInferenceContext } from '@kbn/inference-tracing';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import type {
  EvalsExecutorClient,
  Evaluator,
  EvaluationDataset,
  ExperimentTask,
  Example,
  RanExperiment,
  TaskOutput,
  ImprovementSuggestionAnalysisResult,
  ImprovementSuggestionCategory,
} from '../types';
import type { ImprovementSuggestionsService } from '../utils/improvement_suggestions';

function normalizeExample(example: Example) {
  return {
    input: example.input,
    output: example.output ?? null,
    // keep parity with prior normalization: drop empty metadata keys
    metadata: omitBy(example.metadata ?? {}, isEmpty),
  };
}

function computeDatasetId(dataset: EvaluationDataset): string {
  return objectHash({
    name: dataset.name,
    description: dataset.description,
    examples: dataset.examples.map(normalizeExample),
  });
}

/**
 * Options for generating improvement suggestions from an experiment.
 */
export interface GenerateImprovementSuggestionsOptions {
  /** The experiment to analyze */
  experiment: RanExperiment;
  /** Optional model identifier to include in analysis metadata */
  model?: string;
  /** Additional context to guide the analysis (e.g., workflow description) */
  additionalContext?: string;
  /** Specific categories to focus on during analysis */
  focusCategories?: ImprovementSuggestionCategory[];
}

/**
 * Options for running an experiment with automatic suggestion generation.
 */
export interface RunExperimentWithSuggestionsOptions<
  TEvaluationDataset extends EvaluationDataset,
  TTaskOutput extends TaskOutput = TaskOutput
> {
  /** The evaluation dataset */
  dataset: TEvaluationDataset;
  /** Optional metadata for the experiment */
  metadata?: Record<string, unknown>;
  /** The task function to execute for each example */
  task: ExperimentTask<TEvaluationDataset['examples'][number], TTaskOutput>;
  /** Maximum concurrent task executions */
  concurrency?: number;
  /** Whether to trust upstream dataset for ID computation */
  trustUpstreamDataset?: boolean;
  /** Additional context for suggestion generation */
  additionalContext?: string;
  /** Specific categories to focus on */
  focusCategories?: ImprovementSuggestionCategory[];
}

/**
 * Result of running an experiment with improvement suggestions.
 */
export interface ExperimentWithSuggestionsResult {
  /** The completed experiment */
  experiment: RanExperiment;
  /** Improvement suggestions generated from the experiment */
  suggestions: ImprovementSuggestionAnalysisResult;
}

/**
 * Configuration options for the KibanaEvalsClient.
 */
export interface KibanaEvalsClientOptions {
  /** Logger instance for diagnostic output */
  log: SomeDevLog;
  /** Model configuration used for evaluations */
  model: Model;
  /** Unique identifier for this evaluation run */
  runId: string;
  /** Number of times to repeat each example (default: 1) */
  repetitions?: number;
  /** Optional improvement suggestions service for analysis */
  improvementSuggestionsService?: ImprovementSuggestionsService;
}

export class KibanaEvalsClient implements EvalsExecutorClient {
  private readonly experiments: RanExperiment[] = [];
  private readonly improvementSuggestionsService?: ImprovementSuggestionsService;

  constructor(private readonly options: KibanaEvalsClientOptions) {
    this.improvementSuggestionsService = options.improvementSuggestionsService;
  }

  async runExperiment<
    TEvaluationDataset extends EvaluationDataset,
    TTaskOutput extends TaskOutput = TaskOutput
  >(
    {
      dataset,
      task,
      metadata: experimentMetadata,
      concurrency,
      trustUpstreamDataset: _trustUpstreamDataset,
    }: {
      dataset: TEvaluationDataset;
      metadata?: Record<string, unknown>;
      task: ExperimentTask<TEvaluationDataset['examples'][number], TTaskOutput>;
      concurrency?: number;
      trustUpstreamDataset?: boolean;
    },
    evaluators: Array<Evaluator<TEvaluationDataset['examples'][number], TTaskOutput>>
  ): Promise<RanExperiment> {
    return withInferenceContext(async () => {
      const datasetId = computeDatasetId(dataset);
      const experimentId = randomUUID();
      const repetitions = this.options.repetitions ?? 1;
      const runConcurrency = Math.max(1, concurrency ?? 1);
      const limiter = pLimit(runConcurrency);

      const evaluationRuns: RanExperiment['evaluationRuns'] = [];
      const runs: RanExperiment['runs'] = {};

      const runJobs: Array<Promise<void>> = [];

      this.options.log.info(
        `🧪 Starting experiment "Run ID: ${this.options.runId} - Dataset: ${dataset.name}" with ${evaluators.length} evaluators and ${runConcurrency} concurrent runs`
      );

      for (let rep = 0; rep < repetitions; rep++) {
        dataset.examples.forEach((example, exampleIndex) => {
          runJobs.push(
            limiter(async () => {
              const runKey = `${exampleIndex}-${rep}-${randomUUID()}`;

              this.options.log.info(
                `🔧 Running task "task" on dataset "${datasetId}" (exampleIndex=${exampleIndex}, repetition=${rep})`
              );

              const taskOutput = await task(example);

              runs[runKey] = {
                exampleIndex,
                repetition: rep,
                input: example.input,
                expected: example.output ?? null,
                metadata: example.metadata ?? {},
                output: taskOutput,
                evalThreadId: randomUUID(),
              };

              this.options.log.info(
                `🧠 Evaluating run (exampleIndex=${exampleIndex}, repetition=${rep}) with ${evaluators.length} evaluators`
              );

              const results = await Promise.all(
                evaluators.map(async (evaluator) => {
                  this.options.log.info(
                    `🧠 Evaluating run (exampleIndex=${exampleIndex}, repetition=${rep}) with evaluator "${evaluator.name}"`
                  );
                  const result = await evaluator.evaluate({
                    input: example.input,
                    output: taskOutput,
                    expected: example.output ?? null,
                    metadata: example.metadata ?? {},
                  });
                  this.options.log.info(
                    `✅ Evaluator "${evaluator.name}" on run (exampleIndex=${exampleIndex}, repetition=${rep}) completed`
                  );
                  return { evaluatorName: evaluator.name, result };
                })
              );

              results.forEach(({ evaluatorName, result }) => {
                evaluationRuns.push({
                  name: evaluatorName,
                  result,
                  runKey,
                  exampleIndex,
                  repetition: rep,
                });
              });
            })
          );
        });
      }

      await Promise.all(runJobs);
      this.options.log.info(`✅ Experiment ${experimentId} completed`);

      const ranExperiment: RanExperiment = {
        id: experimentId,
        datasetId,
        datasetName: dataset.name,
        datasetDescription: dataset.description,
        runs,
        evaluationRuns,
        experimentMetadata: {
          ...experimentMetadata,
          model: this.options.model,
          runId: this.options.runId,
        },
      };

      this.experiments.push(ranExperiment);
      return ranExperiment;
    });
  }

  async getRanExperiments(): Promise<RanExperiment[]> {
    return this.experiments;
  }

  /**
   * Generates improvement suggestions for a completed experiment.
   *
   * This method analyzes the experiment results and generates actionable
   * recommendations for improving the LLM workflow. It requires an
   * ImprovementSuggestionsService to be configured during client initialization.
   *
   * @param options - Options for generating suggestions
   * @returns Analysis result containing suggestions and summary
   * @throws Error if no improvement suggestions service was provided
   *
   * @example
   * ```typescript
   * const experiment = await client.runExperiment({ dataset, task }, evaluators);
   * const suggestions = await client.generateImprovementSuggestions({
   *   experiment,
   *   additionalContext: 'This is a RAG workflow for documentation search',
   *   focusCategories: ['context_retrieval', 'accuracy'],
   * });
   * console.log(suggestions.suggestions);
   * ```
   */
  async generateImprovementSuggestions(
    options: GenerateImprovementSuggestionsOptions
  ): Promise<ImprovementSuggestionAnalysisResult> {
    if (!this.improvementSuggestionsService) {
      throw new Error(
        'Improvement suggestions require an ImprovementSuggestionsService. ' +
          'Provide improvementSuggestionsService in the client configuration.'
      );
    }

    const { experiment, model, additionalContext, focusCategories } = options;

    this.options.log.info(
      `📊 Generating improvement suggestions for experiment "${experiment.id}" (dataset: ${experiment.datasetName})`
    );

    const result = await this.improvementSuggestionsService.analyze({
      experiment,
      model: model ?? this.options.model.id,
      additionalContext,
      focusCategories,
    });

    this.options.log.info(
      `✅ Generated ${result.suggestions.length} improvement suggestions (${result.summary.byImpact.high ?? 0} high impact)`
    );

    return result;
  }

  /**
   * Runs an experiment and automatically generates improvement suggestions.
   *
   * This is a convenience method that combines `runExperiment` and
   * `generateImprovementSuggestions` into a single call. It requires an
   * ImprovementSuggestionsService to be configured during client initialization.
   *
   * @param options - Options for running the experiment
   * @param evaluators - Array of evaluators to run on each example
   * @returns The experiment results and improvement suggestions
   * @throws Error if no improvement suggestions service was provided
   *
   * @example
   * ```typescript
   * const { experiment, suggestions } = await client.runExperimentWithSuggestions(
   *   {
   *     dataset,
   *     task,
   *     additionalContext: 'This evaluates a security assistant workflow',
   *     focusCategories: ['tool_selection', 'accuracy'],
   *   },
   *   evaluators
   * );
   * ```
   */
  async runExperimentWithSuggestions<
    TEvaluationDataset extends EvaluationDataset,
    TTaskOutput extends TaskOutput = TaskOutput
  >(
    options: RunExperimentWithSuggestionsOptions<TEvaluationDataset, TTaskOutput>,
    evaluators: Array<Evaluator<TEvaluationDataset['examples'][number], TTaskOutput>>
  ): Promise<ExperimentWithSuggestionsResult> {
    if (!this.improvementSuggestionsService) {
      throw new Error(
        'runExperimentWithSuggestions requires an ImprovementSuggestionsService. ' +
          'Provide improvementSuggestionsService in the client configuration.'
      );
    }

    const {
      dataset,
      metadata,
      task,
      concurrency,
      trustUpstreamDataset,
      additionalContext,
      focusCategories,
    } = options;

    // Run the experiment
    const experiment = await this.runExperiment(
      {
        dataset,
        metadata,
        task,
        concurrency,
        trustUpstreamDataset,
      },
      evaluators
    );

    // Generate improvement suggestions
    const suggestions = await this.generateImprovementSuggestions({
      experiment,
      additionalContext,
      focusCategories,
    });

    return { experiment, suggestions };
  }

  /**
   * Checks if the client has an improvement suggestions service configured.
   * @returns true if improvement suggestions can be generated
   */
  hasImprovementSuggestionsService(): boolean {
    return this.improvementSuggestionsService !== undefined;
  }

  /**
   * Gets the improvement suggestions service if configured.
   * @returns The improvement suggestions service or undefined
   */
  getImprovementSuggestionsService(): ImprovementSuggestionsService | undefined {
    return this.improvementSuggestionsService;
  }
}
