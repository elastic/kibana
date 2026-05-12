/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EvaluatorRegistry } from '../evaluation_engine';
import type { DatasetService } from '../../storage/dataset_service';
import { persistEvalRun } from './eval_results_persister';
import { indexFailures } from './failure_harvester';
import {
  buildLlmRequestBody,
  extractLlmResponseText,
  getConnectorTypeId,
  type LlmChatMessage,
} from './llm_defaults';

export interface SkillOnlineEvalResult {
  runId: string;
  datasetId: string;
  datasetName: string;
  examplesRan: number;
  durationMs: number;
  summary: { meanScore: number; passRate: number };
}

export interface OnlineEvalRun {
  runId: string;
  skillId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  progress: { completed: number; total: number };
  summary?: {
    meanScore: number;
    passRate: number;
    examplesRan: number;
    examplesSkipped: number;
    durationMs: number;
  };
  evaluatorScores?: Array<{
    name: string;
    meanScore: number;
    passCount: number;
    failCount: number;
  }>;
  error?: string;
}

const MAX_RUN_HISTORY = 10;

export class SkillOnlineEvalService {
  /** Exposed so route handlers can use it for evaluator selection */
  public readonly evaluatorRegistry: EvaluatorRegistry;

  /** In-memory tracking of online eval runs for progress polling */
  private readonly runs = new Map<string, OnlineEvalRun>();

  constructor(
    evaluatorRegistry: EvaluatorRegistry,
    private readonly datasetService: DatasetService,
    private readonly logger: Logger
  ) {
    this.evaluatorRegistry = evaluatorRegistry;
  }

  /** Get the latest run for a given skill (most recent by startedAt) */
  getLatestRun(skillId: string): OnlineEvalRun | undefined {
    let latest: OnlineEvalRun | undefined;
    for (const run of this.runs.values()) {
      if (run.skillId === skillId) {
        if (!latest || run.startedAt > latest.startedAt) {
          latest = run;
        }
      }
    }
    return latest;
  }

  /** Get a specific run by ID */
  getRun(runId: string): OnlineEvalRun | undefined {
    return this.runs.get(runId);
  }

  /** Trim old runs keeping only the most recent per skill */
  private trimRunHistory(): void {
    if (this.runs.size <= MAX_RUN_HISTORY) return;
    const entries = Array.from(this.runs.entries()).sort((a, b) =>
      b[1].startedAt.localeCompare(a[1].startedAt)
    );
    const toRemove = entries.slice(MAX_RUN_HISTORY);
    for (const [id] of toRemove) {
      this.runs.delete(id);
    }
  }

  async runOnlineEval(
    skill: { id: string; name: string; description: string; markdown: string },
    options: {
      connectorId: string;
      actionsClient: { execute: (...args: any[]) => Promise<any> };
      esClient: ElasticsearchClient;
      evaluatorNames?: string[];
      /** Dataset name prefix — defaults to 'aesop-skill-eval' for backwards compat */
      datasetNamePrefix?: string;
      /** Optional externally-provided runId for tracking */
      runId?: string;
    }
  ): Promise<SkillOnlineEvalResult> {
    const startTime = Date.now();
    const runId = options.runId ?? randomUUID();
    const prefix = options.datasetNamePrefix ?? 'aesop-skill-eval';
    const datasetName = `${prefix}:${skill.id}`;

    // 1. Load dataset
    const datasetClient = this.datasetService.getClient(options.esClient);
    const dataset = await datasetClient.getByName(datasetName);
    if (!dataset || !dataset.examples?.length) {
      // Mark run as failed if tracked
      const tracked = this.runs.get(runId);
      if (tracked) {
        tracked.status = 'failed';
        tracked.error = `No eval dataset found for skill "${skill.name}". Generate a dataset first.`;
        tracked.completedAt = new Date().toISOString();
      }
      throw new Error(`No eval dataset found for skill "${skill.name}". Generate a dataset first.`);
    }

    // Update tracked run with total count now that we know it
    const trackedRun = this.runs.get(runId);
    if (trackedRun) {
      trackedRun.progress.total = dataset.examples.length;
    }

    this.logger.info(
      `[AESOP] Running online eval for "${skill.name}" with ${dataset.examples.length} examples`
    );

    // 2. Setup evaluators and inference client
    const evaluatorNames = options.evaluatorNames || [
      'skill-relevance',
      'skill-accuracy',
      'skill-completeness',
    ];
    const { createEvaluationRunner } = await import('../evaluation_engine');
    const runner = createEvaluationRunner(this.evaluatorRegistry, this.logger);
    const inferenceClient = this.buildInferenceClient(options);

    // 3. Process each example incrementally: infer → evaluate → persist
    //    This ensures partial results are visible even if the run fails mid-way.
    const allItems: Array<{
      exampleId: string;
      index: number;
      input: Record<string, unknown>;
      output: unknown;
      expected: unknown;
    }> = [];
    const allFlatResults: Array<{
      itemIndex: number;
      evaluator: string;
      score: number | null;
      label?: string;
      explanation?: string;
    }> = [];

    let skippedExamples = 0;

    for (let idx = 0; idx < dataset.examples.length; idx++) {
      const example = dataset.examples[idx];
      const query =
        (example.input as Record<string, unknown>)?.query ?? JSON.stringify(example.input);

      // 3a. Infer: get agent output via LLM
      let agentOutput: unknown;
      try {
        agentOutput = await this.getSkillOutput(skill.markdown, String(query), options);
      } catch (inferErr) {
        // Inference failed (LLM timeout, connector error) — skip entire example
        skippedExamples++;
        this.logger.warn(
          `[AESOP] Example ${idx + 1}/${
            dataset.examples.length
          } inference failed for run ${runId}, skipping: ${
            inferErr instanceof Error ? inferErr.message : String(inferErr)
          }`
        );
        if (trackedRun) {
          trackedRun.progress.completed = idx + 1;
        }
        continue;
      }

      const item = {
        exampleId: example.id,
        index: idx,
        input: {
          ...((example.input as Record<string, unknown>) || {}),
          name: skill.name,
          description: skill.description,
          markdown: skill.markdown,
        },
        output: agentOutput,
        expected: example.output,
      };
      allItems.push(item);

      // 3b. Evaluate: run each evaluator independently so one timeout doesn't
      //     lose results from other evaluators for this example.
      const exampleFlatResults: typeof allFlatResults = [];

      for (const evaluatorName of evaluatorNames) {
        try {
          const evalResult = await runner.run({
            items: [{ input: item.input, output: item.output, expected: item.expected }],
            evaluatorNames: [evaluatorName],
            connectorId: options.connectorId,
            inferenceClient,
            esClient: options.esClient,
          });

          for (const resultItem of evalResult.results) {
            for (const er of resultItem.evaluatorResults) {
              const flat = {
                itemIndex: idx,
                evaluator: er.evaluator,
                score: er.score,
                label: er.label,
                explanation: er.explanation,
              };
              exampleFlatResults.push(flat);
              allFlatResults.push(flat);
            }
          }
        } catch (evalErr) {
          this.logger.warn(
            `[AESOP] Evaluator "${evaluatorName}" failed on example ${idx + 1} for run ${runId}: ${
              evalErr instanceof Error ? evalErr.message : String(evalErr)
            }`
          );
        }
      }

      // 3c. Persist whatever evaluator results we got for this example
      if (exampleFlatResults.length > 0) {
        try {
          await persistEvalRun({
            runId,
            datasetId: dataset.id,
            datasetName,
            skillId: skill.id,
            skillName: skill.name,
            connectorId: options.connectorId,
            items: [item],
            evaluatorResults: exampleFlatResults.map((r) => ({ ...r, itemIndex: 0 })),
            esClient: options.esClient,
            logger: this.logger,
          });
        } catch (persistErr) {
          this.logger.warn(
            `[AESOP] Failed to persist example ${idx} for run ${runId}: ${
              persistErr instanceof Error ? persistErr.message : String(persistErr)
            }`
          );
        }
      }

      // 3d. Update progress
      if (trackedRun) {
        trackedRun.progress.completed = idx + 1;
      }
    }

    // 4. Index failures for regression harvesting
    try {
      await indexFailures(
        options.esClient,
        runId,
        skill.id,
        allFlatResults,
        allItems.map((i) => ({ input: i.input, output: i.output })),
        this.logger
      );
    } catch (harvestErr) {
      this.logger.warn(
        `[AESOP] Failed to index eval failures: ${
          harvestErr instanceof Error ? harvestErr.message : String(harvestErr)
        }`
      );
    }

    if (skippedExamples > 0) {
      this.logger.warn(
        `[AESOP] Run ${runId}: ${skippedExamples}/${dataset.examples.length} examples skipped due to errors`
      );
    }

    // 5. Compute final summary
    const scores = allFlatResults
      .map((r) => r.score)
      .filter((s): s is number => s != null && !isNaN(s));
    const meanScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const passRate = scores.length > 0 ? scores.filter((s) => s >= 0.7).length / scores.length : 0;
    const durationMs = Date.now() - startTime;

    // Compute per-evaluator breakdown
    const evaluatorScores = this.computeEvaluatorScores(allFlatResults);

    // Update tracked run with final results
    if (trackedRun) {
      trackedRun.status = 'completed';
      trackedRun.completedAt = new Date().toISOString();
      trackedRun.summary = {
        meanScore,
        passRate,
        examplesRan: allItems.length,
        examplesSkipped: skippedExamples,
        durationMs,
      };
      trackedRun.evaluatorScores = evaluatorScores;
    }

    return {
      runId,
      datasetId: dataset.id,
      datasetName,
      examplesRan: allItems.length,
      durationMs,
      summary: { meanScore, passRate },
    };
  }

  /** Register a new run for tracking and return the run object */
  registerRun(skillId: string, runId: string): OnlineEvalRun {
    const run: OnlineEvalRun = {
      runId,
      skillId,
      status: 'running',
      startedAt: new Date().toISOString(),
      progress: { completed: 0, total: 0 },
    };
    this.runs.set(runId, run);
    this.trimRunHistory();
    return run;
  }

  /** Mark a tracked run as failed */
  failRun(runId: string, error: string): void {
    const run = this.runs.get(runId);
    if (run) {
      run.status = 'failed';
      run.error = error;
      run.completedAt = new Date().toISOString();
    }
  }

  /** Compute per-evaluator score breakdown */
  private computeEvaluatorScores(
    flatResults: Array<{ evaluator: string; score: number | null }>
  ): OnlineEvalRun['evaluatorScores'] {
    const byEvaluator = new Map<string, number[]>();
    for (const { evaluator, score } of flatResults) {
      if (score == null || isNaN(score)) continue;
      const existing = byEvaluator.get(evaluator) ?? [];
      existing.push(score);
      byEvaluator.set(evaluator, existing);
    }

    return Array.from(byEvaluator.entries()).map(([name, evalScores]) => ({
      name,
      meanScore: evalScores.reduce((a, b) => a + b, 0) / evalScores.length,
      passCount: evalScores.filter((s) => s >= 0.7).length,
      failCount: evalScores.filter((s) => s < 0.7).length,
    }));
  }

  /**
   * Wraps the actions client as a chatComplete-compatible inference client
   * that LLM-judge evaluators can call.
   */
  private buildInferenceClient(options: {
    actionsClient: { execute: (...args: any[]) => Promise<any>; get?: (...args: any[]) => any };
    connectorId: string;
  }) {
    return {
      chatComplete: async (params: {
        messages: Array<{ role: string; content: string }>;
      }): Promise<{ content?: string }> => {
        const connectorTypeId = await getConnectorTypeId(
          options.actionsClient as any,
          options.connectorId
        );
        const result = await options.actionsClient.execute({
          actionId: options.connectorId,
          params: {
            subAction: 'run',
            subActionParams: {
              body: JSON.stringify(
                buildLlmRequestBody({
                  messages: params.messages as LlmChatMessage[],
                  temperature: 0,
                  connectorTypeId,
                })
              ),
            },
          },
        });

        const content = extractLlmResponseText((result as any)?.data);

        return { content };
      },
    };
  }

  private async getSkillOutput(
    skillMarkdown: string,
    userQuery: string,
    options: {
      actionsClient: { execute: (...args: any[]) => Promise<any>; get?: (...args: any[]) => any };
      connectorId: string;
    }
  ): Promise<unknown> {
    try {
      const connectorTypeId = await getConnectorTypeId(
        options.actionsClient as any,
        options.connectorId
      );
      const result = await options.actionsClient.execute({
        actionId: options.connectorId,
        params: {
          subAction: 'run',
          subActionParams: {
            body: JSON.stringify(
              buildLlmRequestBody({
                system: `You are a security analyst agent. Follow this skill to answer the user's question:\n\n${skillMarkdown}`,
                messages: [{ role: 'user', content: userQuery }],
                connectorTypeId,
              })
            ),
          },
        },
      });

      return extractLlmResponseText((result as any)?.data);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
}
