/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { trace } from '@opentelemetry/api';
import { computeCompositeScore, evaluateCiGates } from './convergence_loop';
import type { EvaluatorRegistry } from '../evaluation_engine';
import { createEvaluationRunner } from '../evaluation_engine';
import type {
  ProposedSkillDocument,
  ConvergenceConfig,
  SkillValidation,
  SkillEvaluatorResult,
} from './types';
import {
  runConvergenceLoop,
  getDefaultCompositeConfig,
  resolveEvaluatorNames,
} from './convergence_loop';
import { buildImprovementPrompt } from './improvement_prompt';
import { withAesopSpan } from './monitoring/tracing';

const GRADE_THRESHOLDS: Array<[string, number]> = [
  ['A', 0.9],
  ['B', 0.8],
  ['C', 0.7],
  ['D', 0.6],
  ['F', 0],
];

const getGrade = (score: number): string =>
  GRADE_THRESHOLDS.find(([, threshold]) => score >= threshold)?.[0] ?? 'F';

export class SkillValidationService {
  constructor(
    private readonly evaluatorRegistry: EvaluatorRegistry,
    private readonly logger: Logger
  ) {}

  async validateSkill(
    skill: ProposedSkillDocument,
    config: ConvergenceConfig,
    options?: {
      autoConverge?: boolean;
      inferenceClient?: {
        chatComplete: (params: {
          messages: Array<{ role: string; content: string }>;
        }) => Promise<{ content?: string }>;
      };
    }
  ): Promise<SkillValidation> {
    const mode = options?.autoConverge ? 'convergence' : 'single';

    return withAesopSpan(
      `aesop.skill.validation.${mode}`,
      {
        attributes: {
          'aesop.kind': 'skill_validation',
          'aesop.validation_mode': mode,
          'aesop.skill_id': skill.id ?? '',
          'aesop.skill_name': skill.name,
          'aesop.connector_id': config.connectorId,
        },
      },
      async () => {
        if (!options?.autoConverge) {
          const result = await this.runSingleValidation(skill, config);
          this.recordValidationOutcomeOnActiveSpan(result);
          return result;
        }

        const inferenceClient = options.inferenceClient;
        if (!inferenceClient) {
          throw new Error('autoConverge requires an inferenceClient');
        }

        const improveSkill = async (
          currentSkill: ProposedSkillDocument,
          feedback: SkillEvaluatorResult[]
        ): Promise<ProposedSkillDocument> => {
          return this.improveSkillViaLlm(currentSkill, feedback, inferenceClient);
        };

        const result = await runConvergenceLoop(skill, config, {
          evaluatorRegistry: this.evaluatorRegistry,
          logger: this.logger,
          improveSkill,
        });

        const lastIterationResults =
          result.iterations[result.iterations.length - 1]?.evaluator_results;

        const validation: SkillValidation = {
          status: result.converged ? 'passed' : 'failed',
          final_score: result.finalScore,
          composite_score: result.finalScore,
          composite_grade: getGrade(result.finalScore),
          started_at: new Date(Date.now() - result.totalDurationMs).toISOString(),
          completed_at: new Date().toISOString(),
          connector_id: config.connectorId,
          duration_ms: result.totalDurationMs,
          evaluator_results: lastIterationResults,
          gate_result: {
            passed: result.gateResult.passed,
            failed_gates: result.gateResult.failedGates,
          },
          iterations: result.iterations,
          convergence: {
            converged: result.converged,
            reason: result.reason,
            total_iterations: result.iterations.length,
            total_duration_ms: result.totalDurationMs,
          },
        };
        this.recordValidationOutcomeOnActiveSpan(validation);
        return validation;
      }
    );
  }

  /**
   * Stamp the final score, grade, and gate outcome onto whatever span is
   * currently active so APM can filter validations by pass/fail without
   * having to read the document body.
   */
  private recordValidationOutcomeOnActiveSpan(validation: SkillValidation): void {
    const span = trace.getActiveSpan();
    if (!span?.isRecording()) return;
    // SkillValidation has several optional fields (composite_score/_grade,
    // gate_result, duration_ms, convergence). Stamp them defensively so a
    // partially-populated result doesn't throw when handed to setAttribute,
    // which only accepts defined AttributeValue types.
    span.setAttribute('aesop.validation.status', validation.status);
    if (typeof validation.composite_score === 'number') {
      span.setAttribute('aesop.validation.composite_score', validation.composite_score);
    }
    if (typeof validation.composite_grade === 'string') {
      span.setAttribute('aesop.validation.composite_grade', validation.composite_grade);
    }
    if (validation.gate_result) {
      span.setAttribute('aesop.validation.gate_passed', validation.gate_result.passed);
    }
    if (typeof validation.duration_ms === 'number') {
      span.setAttribute('aesop.validation.duration_ms', validation.duration_ms);
    }
    if (validation.convergence) {
      span.setAttribute('aesop.validation.iterations', validation.convergence.total_iterations);
      span.setAttribute('aesop.validation.converged', validation.convergence.converged);
    }
  }

  private async runSingleValidation(
    skill: ProposedSkillDocument,
    config: ConvergenceConfig
  ): Promise<SkillValidation> {
    const startTime = Date.now();
    const evaluatorNames = resolveEvaluatorNames(
      config.evaluators ?? ['skill-preset'],
      this.evaluatorRegistry
    );
    const runner = createEvaluationRunner(this.evaluatorRegistry, this.logger);

    const runResult = await runner.run({
      items: [
        {
          input: { name: skill.name, description: skill.description },
          output: skill.markdown,
        },
      ],
      evaluatorNames,
      connectorId: config.connectorId,
      requiredPass: config.requiredPass,
    });

    const serverResults = runResult.results[0]?.evaluatorResults ?? [];
    const evaluatorResults: SkillEvaluatorResult[] = serverResults.map((r) => ({
      evaluator: r.evaluator,
      kind: r.kind,
      score: r.score,
      pass: r.score !== null && r.score > 0,
      explanation: r.explanation,
      trace_id: r.traceId,
    }));

    const compositeResult = computeCompositeScore(
      evaluatorResults.map((r) => ({ evaluator: r.evaluator, score: r.score })),
      getDefaultCompositeConfig()
    );

    const gateResult = evaluateCiGates(
      evaluatorResults.map((r) => ({ evaluator: r.evaluator, score: r.score })),
      compositeResult.compositeScore,
      { requiredPass: config.requiredPass, compositeThreshold: config.threshold }
    );

    const durationMs = Date.now() - startTime;

    return {
      status: gateResult.passed ? 'passed' : 'failed',
      final_score: compositeResult.compositeScore,
      composite_score: compositeResult.compositeScore,
      composite_grade: compositeResult.compositeGrade,
      started_at: new Date(Date.now() - durationMs).toISOString(),
      completed_at: new Date().toISOString(),
      connector_id: config.connectorId,
      duration_ms: durationMs,
      evaluator_results: evaluatorResults,
      gate_result: {
        passed: gateResult.passed,
        failed_gates: gateResult.failedGates,
      },
    };
  }

  private async improveSkillViaLlm(
    skill: ProposedSkillDocument,
    feedback: SkillEvaluatorResult[],
    inferenceClient: {
      chatComplete: (params: {
        messages: Array<{ role: string; content: string }>;
      }) => Promise<{ content?: string }>;
    }
  ): Promise<ProposedSkillDocument> {
    const prompt = buildImprovementPrompt(skill, feedback);

    const result = await inferenceClient.chatComplete({
      messages: [{ role: 'user', content: prompt }],
    });

    const content = result.content ?? '';

    const jsonMatch = content.match(
      /\{[\s\S]*"name"[\s\S]*"description"[\s\S]*"markdown"[\s\S]*\}/
    );
    if (!jsonMatch) {
      throw new Error('LLM did not return valid JSON for skill improvement');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      name: string;
      description: string;
      markdown: string;
    };

    return {
      ...skill,
      name: parsed.name,
      description: parsed.description,
      markdown: parsed.markdown,
    };
  }
}
