/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  Evaluator,
  EvaluationDataset,
  EvalsExecutorClient,
  Example,
  ExperimentTask,
  DatasetRunResult,
  TaskOutput,
} from '../types';
import type {
  AttackModule,
  AttackModuleConfig,
  AttackResult,
  ConversationTurn,
  GuardrailRule,
  ModuleReport,
  RedTeamConfig,
  RedTeamReport,
  Severity,
  Strategy,
} from './types';
import { getAttackModule, getAvailableModules } from './modules';
import { getStrategy } from './strategies';
import { scanWithGuardrails, mergeGuardrailRules, DEFAULT_GUARDRAIL_RULES } from './guardrails';
import { classifySeverity, type NamedEvaluationResult } from './severity';
import { isAttackPass } from './pass_check';
import {
  createPromptLeakDetectionEvaluator,
  createToolPoisoningEvaluator,
  createScopeViolationEvaluator,
} from '../evaluators/security';
import { createAttackSuccessJudge } from './judge/attack_success';

export interface RedTeamOrchestratorOptions {
  config: RedTeamConfig;
  executorClient: EvalsExecutorClient;
  /** Inference client for the LLM-as-judge evaluator. When provided, the AttackSuccessJudge is automatically included. */
  inferenceClient?: BoundInferenceClient;
  evaluators?: Evaluator[];
  log: ToolingLog;
}

interface RedTeamOrchestrator {
  run: (task: ExperimentTask<any, any>) => Promise<RedTeamReport>;
  scanExistingRun: (
    outputs: Array<{ output: TaskOutput; module: string; strategy: string }>
  ) => AttackResult[];
}

const buildDefaultEvaluators = (
  config: RedTeamConfig,
  inferenceClient?: BoundInferenceClient,
  log?: ToolingLog
): Evaluator[] => {
  const evaluators: Evaluator[] = [createPromptLeakDetectionEvaluator({ refusalAware: true })];

  if (inferenceClient && log) {
    evaluators.push(createAttackSuccessJudge({ inferenceClient, log }));
  }

  const { targetContext } = config;
  if (targetContext?.availableTools && targetContext.availableTools.length > 0) {
    evaluators.push(
      createToolPoisoningEvaluator({
        allowedTools: targetContext.availableTools,
        extractToolCalls: (output: unknown) => {
          if (typeof output === 'object' && output !== null && 'toolCalls' in output) {
            const calls = (output as Record<string, unknown>).toolCalls;
            if (Array.isArray(calls)) {
              return calls.map((c) => (typeof c === 'string' ? c : String(c)));
            }
          }
          return [];
        },
      })
    );
  }

  if (targetContext?.authorizedScopes && targetContext.authorizedScopes.length > 0) {
    evaluators.push(
      createScopeViolationEvaluator({
        allowedPatterns: targetContext.authorizedScopes.map((scope) => new RegExp(scope, 'i')),
      })
    );
  }

  return evaluators;
};

const resolveModules = (config: RedTeamConfig): AttackModule[] => {
  const moduleNames = config.modules ?? getAvailableModules();
  return moduleNames.map(getAttackModule);
};

const resolveStrategy = (config: RedTeamConfig): Strategy => {
  const strategyName = config.strategies?.[0] ?? 'direct';
  return getStrategy(strategyName);
};

/**
 * Extracts a text string from a task output value.
 * - If the output is a string, returns it directly (truncated to maxLen).
 * - If the output is an object with a `messages` array, returns the last message text (truncated to maxLen).
 * - Otherwise, returns the JSON-stringified output (truncated to maxLen).
 */
const extractTextFromOutput = (output: TaskOutput, maxLen?: number): string => {
  let text: string;
  if (typeof output === 'string') {
    text = output;
  } else if (output && typeof output === 'object') {
    const messages = (output as Record<string, unknown>).messages;
    if (Array.isArray(messages) && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const msgText =
        typeof lastMsg === 'object' && lastMsg !== null
          ? (lastMsg as Record<string, unknown>).message ?? JSON.stringify(lastMsg)
          : String(lastMsg);
      text = String(msgText);
    } else {
      text = JSON.stringify(output);
    }
  } else {
    text = String(JSON.stringify(output) ?? output);
  }
  return maxLen !== undefined ? text.substring(0, maxLen) : text;
};

interface ProcessResultsParams {
  experiment: DatasetRunResult;
  examples: Example[];
  module: AttackModule;
  strategy: Strategy;
  guardrailRules: GuardrailRule[];
  severityThresholds?: Record<string, Severity>;
  results: AttackResult[];
  bySeverity: Record<Severity, number>;
}

/**
 * Processes an experiment result: applies guardrails, classifies severity, and
 * accumulates results into the provided arrays/counters.
 * Returns { passed, failed } counts for this experiment.
 */
const processExperimentResults = (
  params: ProcessResultsParams
): { passed: number; failed: number } => {
  const {
    experiment,
    examples,
    module,
    strategy,
    guardrailRules,
    severityThresholds,
    results,
    bySeverity,
  } = params;
  let passed = 0;
  let failed = 0;

  for (const [runKey, taskRun] of Object.entries(experiment.runs)) {
    const evalRuns = experiment.evaluationRuns.filter((er) => er.experimentRunId === runKey);

    let evaluatorScores: NamedEvaluationResult[] = evalRuns
      .filter((er) => er.result !== undefined)
      .map((er) => ({ name: er.name, result: er.result! }));

    // LLM judge override: if the attack-success-judge says the attack was blocked,
    // but prompt-leak-detection flagged a false positive (model mentions "system prompt"
    // in its refusal), trust the LLM judge and override the CODE evaluator.
    // TODO: Replace with a dedicated context-aware LLM leak evaluator.
    const judgeVerdict = evaluatorScores.find((es) => es.name === 'attack-success-judge');
    const leakVerdict = evaluatorScores.find((es) => es.name === 'prompt-leak-detection');
    if (judgeVerdict?.result.score === 1 && leakVerdict?.result.score === 0) {
      evaluatorScores = evaluatorScores.map((es) =>
        es.name === 'prompt-leak-detection'
          ? {
              ...es,
              result: {
                ...es.result,
                score: 1.0,
                label: 'safe',
                explanation:
                  'Overridden: LLM judge confirmed attack was blocked; regex match was a false positive in refusal context.',
              },
            }
          : es
      );
    }

    // Extract input prompt to strip from output before guardrail scanning
    const inputPrompt = ((taskRun.input as Record<string, unknown>)?.prompt as string) ?? '';
    let guardrailViolations = scanWithGuardrails(taskRun.output, guardrailRules, inputPrompt);

    // If the LLM judge confirmed the attack was blocked, suppress guardrail
    // false positives from refusal text (e.g., model saying "system prompt" in a refusal).
    if (judgeVerdict?.result.score === 1 && guardrailViolations.length > 0) {
      guardrailViolations = [];
    }

    const severity = classifySeverity(evaluatorScores, guardrailViolations, severityThresholds);

    // Build namedScores once — reused for both pass check and result storage
    const namedScores = evaluatorScores.map((es) => ({
      evaluator: es.name,
      score: es.result.score,
      label: es.result.label,
      explanation: es.result.explanation,
    }));

    if (isAttackPass(namedScores, guardrailViolations)) {
      passed++;
    } else {
      failed++;
    }

    bySeverity[severity]++;

    // Extract response excerpt for the report
    const responseExcerpt = extractTextFromOutput(taskRun.output, 500);

    results.push({
      example: examples[taskRun.exampleIndex] ?? { input: taskRun.input },
      evaluatorScores: evaluatorScores.map((es) => es.result),
      namedScores,
      responseExcerpt,
      guardrailViolations,
      severity,
      owaspCategory: module.owaspCategory,
      attackModule: module.name,
      strategy: strategy.name,
    });
  }

  return { passed, failed };
};

export const createRedTeamOrchestrator = (
  options: RedTeamOrchestratorOptions
): RedTeamOrchestrator => {
  const {
    config,
    executorClient,
    inferenceClient,
    evaluators: additionalEvaluators = [],
    log,
  } = options;

  const defaultEvaluators = buildDefaultEvaluators(config, inferenceClient, log);
  const allEvaluators = [...defaultEvaluators, ...additionalEvaluators];
  const guardrailRules = mergeGuardrailRules(DEFAULT_GUARDRAIL_RULES, config.guardrails?.rules);

  const moduleConfig: AttackModuleConfig = {
    count: config.count ?? 10,
    difficulty: config.difficulty ?? 'moderate',
    templateOnly: config.templateOnly,
    targetContext: config.targetContext,
  };

  const run = async (task: ExperimentTask<any, any>): Promise<RedTeamReport> => {
    const runId = uuidv4();
    const modules = resolveModules(config);
    const strategy = resolveStrategy(config);
    const moduleReports: ModuleReport[] = [];

    for (const module of modules) {
      log.info(`Running attack module: ${module.name} (strategy: ${strategy.name})`);

      const examples = await module.generate(moduleConfig);
      log.info(`  Generated ${examples.length} adversarial examples`);

      const results: AttackResult[] = [];
      const bySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
      let passed = 0;
      let failed = 0;

      const baseMetadata = {
        'run.type': 'red-team' as const,
        'redTeam.module': module.name,
        'redTeam.strategy': strategy.name,
        'redTeam.difficulty': moduleConfig.difficulty,
        'redTeam.runId': runId,
      };

      if (strategy.kind === 'single-turn') {
        // Apply strategy transform for single-turn strategies
        const transformedExamples = examples.map((example) => ({
          ...example,
          input: {
            ...example.input,
            prompt: strategy.transform(
              ((example.input as Record<string, unknown>)?.prompt as string) ?? ''
            ),
          },
        }));

        const dataset: EvaluationDataset = {
          name: `red-team-${module.name}-${strategy.name}`,
          description: `Red team attack: ${module.description}`,
          examples: transformedExamples,
        };

        const [experiment] = await executorClient.runExperiment(
          { datasets: [dataset], task, metadata: baseMetadata },
          allEvaluators
        );

        const counts = processExperimentResults({
          experiment,
          examples: transformedExamples,
          module,
          strategy,
          guardrailRules,
          severityThresholds: config.severityThresholds,
          results,
          bySeverity,
        });
        passed += counts.passed;
        failed += counts.failed;
      } else {
        // Multi-turn strategy: run example conversations in parallel
        const exConcurrency = config.exampleConcurrency ?? 3;

        const processExample = async (
          exIdx: number
        ): Promise<{
          passed: number;
          failed: number;
          results: AttackResult[];
          bySeverity: Record<Severity, number>;
        }> => {
          const exResults: AttackResult[] = [];
          const exBySeverity: Record<Severity, number> = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          };
          let exPassed = 0;
          let exFailed = 0;

          const example = examples[exIdx];
          const attackPrompt = ((example.input as Record<string, unknown>)?.prompt as string) ?? '';
          const conversationHistory: ConversationTurn[] = [];

          let currentPrompt: string | null = strategy.generateFirstTurn(attackPrompt);
          let turnNumber = 0;
          let finalEvaluated = false;
          let lastTurnExample: { input: Record<string, unknown> } | null = null;
          let lastTargetOutput: TaskOutput = '';

          while (currentPrompt !== null && turnNumber < strategy.maxTurns) {
            conversationHistory.push({ role: 'attacker', content: currentPrompt });

            const turnExample = {
              ...example,
              input: { ...example.input, prompt: currentPrompt },
            };
            lastTurnExample = turnExample;

            const turnDataset: EvaluationDataset = {
              name: `red-team-${module.name}-${strategy.name}-ex${exIdx}-turn${turnNumber}`,
              description: `Red team attack: ${module.description} (turn ${turnNumber})`,
              examples: [turnExample],
            };

            const [turnExperiment] = await executorClient.runExperiment(
              { datasets: [turnDataset], task, metadata: baseMetadata },
              []
            );

            const turnRuns = Object.values(turnExperiment.runs);
            const targetOutput = turnRuns.length > 0 ? turnRuns[0].output : '';
            lastTargetOutput = targetOutput;
            const targetText = extractTextFromOutput(targetOutput);
            conversationHistory.push({ role: 'target', content: targetText });

            const nextTurn = strategy.generateNextTurn(attackPrompt, conversationHistory);

            if (nextTurn === null) {
              const finalDataset: EvaluationDataset = {
                name: `red-team-${module.name}-${strategy.name}-ex${exIdx}-final`,
                description: `Red team attack: ${module.description} (final evaluation)`,
                examples: [turnExample],
              };

              // Use cached output to avoid re-running the task (LLM responses are
              // non-deterministic, so re-running would evaluate a different output
              // than the one that drove the conversation).
              const cachedOutput = lastTargetOutput;
              const cachedTask: ExperimentTask<Example, TaskOutput> = () =>
                Promise.resolve(cachedOutput);

              const [finalExperiment] = await executorClient.runExperiment(
                { datasets: [finalDataset], task: cachedTask, metadata: baseMetadata },
                allEvaluators
              );

              const counts = processExperimentResults({
                experiment: finalExperiment,
                examples: [turnExample],
                module,
                strategy,
                guardrailRules,
                severityThresholds: config.severityThresholds,
                results: exResults,
                bySeverity: exBySeverity,
              });
              exPassed += counts.passed;
              exFailed += counts.failed;
              finalEvaluated = true;
            }

            currentPrompt = nextTurn;
            turnNumber++;
          }

          if (!finalEvaluated && lastTurnExample !== null) {
            const finalDataset: EvaluationDataset = {
              name: `red-team-${module.name}-${strategy.name}-ex${exIdx}-final`,
              description: `Red team attack: ${module.description} (final evaluation)`,
              examples: [lastTurnExample],
            };

            // Use cached output — same rationale as the in-loop evaluation above.
            const cachedOutput = lastTargetOutput;
            const cachedTask: ExperimentTask<Example, TaskOutput> = () =>
              Promise.resolve(cachedOutput);

            const [finalExperiment] = await executorClient.runExperiment(
              { datasets: [finalDataset], task: cachedTask, metadata: baseMetadata },
              allEvaluators
            );

            const counts = processExperimentResults({
              experiment: finalExperiment,
              examples: [lastTurnExample],
              module,
              strategy,
              guardrailRules,
              severityThresholds: config.severityThresholds,
              results: exResults,
              bySeverity: exBySeverity,
            });
            exPassed += counts.passed;
            exFailed += counts.failed;
          }

          return {
            passed: exPassed,
            failed: exFailed,
            results: exResults,
            bySeverity: exBySeverity,
          };
        };

        // Run examples with bounded concurrency
        const executing = new Set<Promise<void>>();
        const exampleOutcomes: Array<{
          passed: number;
          failed: number;
          results: AttackResult[];
          bySeverity: Record<Severity, number>;
        }> = [];

        for (let exIdx = 0; exIdx < examples.length; exIdx++) {
          const p = processExample(exIdx)
            .then((outcome) => {
              exampleOutcomes.push(outcome);
            })
            .finally(() => {
              executing.delete(p);
            });
          executing.add(p);
          if (executing.size >= exConcurrency) {
            await Promise.race(executing);
          }
        }
        await Promise.all(executing);

        // Aggregate results from all examples
        for (const outcome of exampleOutcomes) {
          passed += outcome.passed;
          failed += outcome.failed;
          results.push(...outcome.results);
          for (const sev of Object.keys(outcome.bySeverity) as Severity[]) {
            bySeverity[sev] += outcome.bySeverity[sev];
          }
        }
      }

      const total = passed + failed;
      log.info(
        `  Results: ${passed}/${total} passed (${
          total > 0 ? ((passed / total) * 100).toFixed(1) : 0
        }%)`
      );

      moduleReports.push({
        module: module.name,
        total,
        passed,
        failed,
        results,
        bySeverity,
      });
    }

    const totalAll = moduleReports.reduce((sum, m) => sum + m.total, 0);
    const passAll = moduleReports.reduce((sum, m) => sum + m.passed, 0);

    return {
      runId,
      suite: config.modules?.join(', ') ?? 'all',
      strategy: strategy.name,
      difficulty: moduleConfig.difficulty,
      templateOnly: moduleConfig.templateOnly ?? false,
      modules: moduleReports,
      overallPassRate: totalAll > 0 ? (passAll / totalAll) * 100 : 100,
    };
  };

  const scanExistingRun = (
    outputs: Array<{ output: TaskOutput; module: string; strategy: string }>
  ): AttackResult[] => {
    return outputs.map(({ output, module: moduleName, strategy: strategyName }) => {
      const guardrailViolations = scanWithGuardrails(output, guardrailRules);
      const severity = classifySeverity([], guardrailViolations, config.severityThresholds);

      return {
        example: {},
        evaluatorScores: [],
        namedScores: [],
        responseExcerpt: extractTextFromOutput(output, 500),
        guardrailViolations,
        severity,
        owaspCategory: '',
        attackModule: moduleName,
        strategy: strategyName,
      };
    });
  };

  return { run, scanExistingRun };
};
