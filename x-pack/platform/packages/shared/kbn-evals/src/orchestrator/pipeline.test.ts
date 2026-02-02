/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createPipeline,
  PIPELINE_STEP_ORDER,
  type PipelineConfig,
  type PipelineContext,
  type PipelineStepId,
} from './pipeline';
import type {
  RanExperiment,
  EvalsExecutorClient,
  Evaluator,
  EvaluationDataset,
  ImprovementSuggestionAnalysisResult,
} from '../types';
import type { ImprovementAnalyzer } from '../utils/improvement_analyzer';

describe('createPipeline', () => {
  const createMockExperiment = (overrides: Partial<RanExperiment> = {}): RanExperiment => ({
    id: 'exp-123',
    datasetId: 'dataset-1',
    datasetName: 'Test Dataset',
    runs: {
      'run-0': {
        exampleIndex: 0,
        repetition: 1,
        input: { query: 'test query 1' },
        expected: { answer: 'expected answer 1' },
        metadata: null,
        output: { answer: 'actual answer 1' },
      },
      'run-1': {
        exampleIndex: 1,
        repetition: 1,
        input: { query: 'test query 2' },
        expected: { answer: 'expected answer 2' },
        metadata: null,
        output: { answer: 'actual answer 2' },
      },
    },
    evaluationRuns: [
      { name: 'Correctness', exampleIndex: 0, result: { score: 0.9, label: 'PASS' } },
      { name: 'Correctness', exampleIndex: 1, result: { score: 0.8, label: 'PASS' } },
    ],
    ...overrides,
  });

  const createMockDataset = (): EvaluationDataset => ({
    name: 'Test Dataset',
    description: 'A test dataset',
    examples: [
      { input: { query: 'test query 1' }, output: { answer: 'expected answer 1' } },
      { input: { query: 'test query 2' }, output: { answer: 'expected answer 2' } },
    ],
  });

  const createMockEvaluator = (): Evaluator => ({
    name: 'MockEvaluator',
    kind: 'CODE',
    evaluate: jest.fn().mockResolvedValue({ score: 0.85, label: 'PASS' }),
  });

  const createMockTask = () => jest.fn().mockResolvedValue({ answer: 'test answer' });

  const createMockExecutorClient = (experiment?: RanExperiment): EvalsExecutorClient => ({
    runExperiment: jest.fn().mockResolvedValue(experiment ?? createMockExperiment()),
    getRanExperiments: jest.fn().mockResolvedValue([]),
  });

  const createMockAnalysisResult = (): ImprovementSuggestionAnalysisResult => ({
    suggestions: [
      {
        id: 'sug-1',
        title: 'Improve accuracy',
        description: 'Enhance accuracy of responses',
        category: 'accuracy',
        impact: 'high',
        confidence: 'high',
        evidence: [],
        priorityScore: 0.9,
      },
    ],
    summary: {
      totalSuggestions: 1,
      byImpact: { high: 1, medium: 0, low: 0 },
      byCategory: {
        prompt: 0,
        tool_selection: 0,
        response_quality: 0,
        context_retrieval: 0,
        reasoning: 0,
        accuracy: 1,
        efficiency: 0,
        other: 0,
      },
      topPriority: [],
    },
    metadata: {
      runId: 'exp-123',
      datasetName: 'Test Dataset',
      analyzedAt: new Date().toISOString(),
    },
  });

  const createMockImprovementAnalyzer = (
    analysisResult?: ImprovementSuggestionAnalysisResult
  ): ImprovementAnalyzer =>
    ({
      analyze: jest.fn().mockResolvedValue(analysisResult ?? createMockAnalysisResult()),
      analyzeHeuristic: jest.fn().mockReturnValue(analysisResult ?? createMockAnalysisResult()),
      extractDatasetScore: jest.fn(),
      extractExampleDetails: jest.fn().mockReturnValue([]),
      createSummary: jest.fn(),
      mergeResults: jest.fn(),
      analyzeMultiple: jest.fn(),
    } as unknown as ImprovementAnalyzer);

  describe('pipeline structure', () => {
    it('should create a pipeline with the expected interface', () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });

      expect(pipeline).toHaveProperty('run');
      expect(pipeline).toHaveProperty('runStep');
      expect(pipeline).toHaveProperty('getSteps');
      expect(pipeline).toHaveProperty('getStepOrder');
      expect(typeof pipeline.run).toBe('function');
      expect(typeof pipeline.runStep).toBe('function');
      expect(typeof pipeline.getSteps).toBe('function');
      expect(typeof pipeline.getStepOrder).toBe('function');
    });

    it('should return the correct step order', () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });

      expect(pipeline.getStepOrder()).toEqual(PIPELINE_STEP_ORDER);
      expect(pipeline.getStepOrder()).toEqual([
        'eval',
        'trace-collect',
        'analyze',
        'suggest',
        'report',
      ]);
    });

    it('should return all step definitions', () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });
      const steps = pipeline.getSteps();

      expect(steps).toHaveLength(5);
      expect(steps.map((s) => s.id)).toEqual([
        'eval',
        'trace-collect',
        'analyze',
        'suggest',
        'report',
      ]);
    });

    it('should return step definitions with correct metadata', () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });
      const steps = pipeline.getSteps();

      const evalStep = steps.find((s) => s.id === 'eval');
      expect(evalStep).toBeDefined();
      expect(evalStep?.name).toBe('Evaluation');
      expect(evalStep?.dependsOn).toEqual([]);
      expect(evalStep?.optional).toBe(false);

      const analyzeStep = steps.find((s) => s.id === 'analyze');
      expect(analyzeStep).toBeDefined();
      expect(analyzeStep?.dependsOn).toContain('eval');
      expect(analyzeStep?.optional).toBe(true);
    });
  });

  describe('PIPELINE_STEP_ORDER constant', () => {
    it('should have the correct order', () => {
      expect(PIPELINE_STEP_ORDER).toEqual([
        'eval',
        'trace-collect',
        'analyze',
        'suggest',
        'report',
      ]);
    });

    it('should be immutable (returns new array)', () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });

      const order1 = pipeline.getStepOrder();
      const order2 = pipeline.getStepOrder();

      expect(order1).not.toBe(order2);
      expect(order1).toEqual(order2);
    });
  });

  describe('run()', () => {
    it('should return a pipeline controller with expected methods', () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      expect(controller).toHaveProperty('result');
      expect(controller).toHaveProperty('stop');
      expect(controller).toHaveProperty('isStopping');
      expect(controller).toHaveProperty('getCurrentStep');
      expect(controller.result).toBeInstanceOf(Promise);
      expect(typeof controller.stop).toBe('function');
      expect(typeof controller.isStopping).toBe('function');
      expect(typeof controller.getCurrentStep).toBe('function');
    });

    it('should execute all steps in order and return success', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      const result = await controller.result;

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.stepResults).toHaveLength(5);
      expect(result.context.evalOutput).toBeDefined();
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should calculate mean score from evaluation runs', async () => {
      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'Test', exampleIndex: 0, result: { score: 0.8 } },
          { name: 'Test', exampleIndex: 1, result: { score: 0.6 } },
        ],
      });
      const executorClient = createMockExecutorClient(experiment);
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      const result = await controller.result;

      expect(result.context.evalOutput?.meanScore).toBe(0.7);
    });

    it('should handle empty evaluation runs with 0 mean score', async () => {
      const experiment = createMockExperiment({
        evaluationRuns: [],
      });
      const executorClient = createMockExecutorClient(experiment);
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      const result = await controller.result;

      expect(result.context.evalOutput?.meanScore).toBe(0);
    });

    it('should handle null scores as filtered out', async () => {
      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'Test', exampleIndex: 0, result: { score: null } },
          { name: 'Test', exampleIndex: 1, result: { score: 0.8 } },
        ],
      });
      const executorClient = createMockExecutorClient(experiment);
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      const result = await controller.result;

      expect(result.context.evalOutput?.meanScore).toBe(0.8);
    });

    it('should include metadata and model in pipeline context', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
        metadata: { customKey: 'customValue' },
        model: 'gpt-4',
      });

      const result = await controller.result;

      expect(result.context.metadata).toEqual({ customKey: 'customValue' });
      expect(result.context.model).toBe('gpt-4');
    });

    it('should populate context outputs for each step', async () => {
      const executorClient = createMockExecutorClient();
      const improvementAnalyzer = createMockImprovementAnalyzer();
      const pipeline = createPipeline({ executorClient, improvementAnalyzer });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      const result = await controller.result;

      expect(result.context.evalOutput).toBeDefined();
      expect(result.context.traceCollectOutput).toBeDefined();
      expect(result.context.analyzeOutput).toBeDefined();
      expect(result.context.suggestOutput).toBeDefined();
      expect(result.context.reportOutput).toBeDefined();
    });
  });

  describe('pipeline controller', () => {
    it('should track stopping state', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      expect(controller.isStopping()).toBe(false);
      controller.stop();
      expect(controller.isStopping()).toBe(true);

      await controller.result;
    });

    it('should stop after current step when stop() is called', async () => {
      let resolveExperiment: (value: RanExperiment) => void;
      const experimentPromise = new Promise<RanExperiment>((resolve) => {
        resolveExperiment = resolve;
      });

      const executorClient: EvalsExecutorClient = {
        runExperiment: jest.fn().mockReturnValue(experimentPromise),
        getRanExperiments: jest.fn().mockResolvedValue([]),
      };

      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      // Stop immediately
      controller.stop();

      // Resolve the experiment
      resolveExperiment!(createMockExperiment());

      const result = await controller.result;

      // Pipeline should complete but stop after eval
      expect(result.success).toBe(true);
      expect(result.stepResults.length).toBeGreaterThanOrEqual(1);
    });

    it('should return null for getCurrentStep when not running', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      await controller.result;

      expect(controller.getCurrentStep()).toBeNull();
    });
  });

  describe('skipSteps configuration', () => {
    it('should skip specified steps', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({
        executorClient,
        skipSteps: ['trace-collect', 'analyze', 'suggest'],
      });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      const result = await controller.result;

      expect(result.success).toBe(true);

      const skippedSteps = result.stepResults.filter((s) => s.status === 'skipped');
      expect(skippedSteps).toHaveLength(3);
      expect(skippedSteps.map((s) => s.stepId)).toEqual([
        'trace-collect',
        'analyze',
        'suggest',
      ]);
    });

    it('should still execute non-skipped steps', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({
        executorClient,
        skipSteps: ['analyze'],
      });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      const result = await controller.result;

      const evalStep = result.stepResults.find((s) => s.stepId === 'eval');
      expect(evalStep?.status).toBe('completed');

      const analyzeStep = result.stepResults.find((s) => s.stepId === 'analyze');
      expect(analyzeStep?.status).toBe('skipped');
    });

    it('should mark skipped steps with correct timing', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({
        executorClient,
        skipSteps: ['trace-collect'],
      });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      const result = await controller.result;

      const skippedStep = result.stepResults.find((s) => s.stepId === 'trace-collect');
      expect(skippedStep?.status).toBe('skipped');
      expect(skippedStep?.durationMs).toBe(0);
      expect(skippedStep?.startedAt).toBeDefined();
      expect(skippedStep?.completedAt).toBeDefined();
    });
  });

  describe('callbacks', () => {
    it('should call onStepStart before each step', async () => {
      const onStepStart = jest.fn();
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient, onStepStart });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      await controller.result;

      expect(onStepStart).toHaveBeenCalledWith('eval');
      expect(onStepStart).toHaveBeenCalledWith('trace-collect');
      expect(onStepStart).toHaveBeenCalledWith('analyze');
      expect(onStepStart).toHaveBeenCalledWith('suggest');
      expect(onStepStart).toHaveBeenCalledWith('report');
    });

    it('should call onStepComplete after each step', async () => {
      const onStepComplete = jest.fn();
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient, onStepComplete });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      await controller.result;

      expect(onStepComplete).toHaveBeenCalledTimes(5);
      expect(onStepComplete).toHaveBeenCalledWith(
        expect.objectContaining({ stepId: 'eval', status: 'completed' })
      );
    });

    it('should call onStepError when a step fails', async () => {
      const onStepError = jest.fn();
      const error = new Error('Experiment failed');
      const executorClient: EvalsExecutorClient = {
        runExperiment: jest.fn().mockRejectedValue(error),
        getRanExperiments: jest.fn().mockResolvedValue([]),
      };
      const pipeline = createPipeline({ executorClient, onStepError });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      const result = await controller.result;

      expect(result.success).toBe(false);
      expect(onStepError).toHaveBeenCalledWith('eval', error);
    });

    it('should not call callbacks for skipped steps', async () => {
      const onStepStart = jest.fn();
      const onStepComplete = jest.fn();
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({
        executorClient,
        skipSteps: ['analyze'],
        onStepStart,
        onStepComplete,
      });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      await controller.result;

      expect(onStepStart).not.toHaveBeenCalledWith('analyze');
      // onStepComplete is also not called for skipped steps
    });
  });

  describe('runStep()', () => {
    it('should run a single step by ID', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });

      const context: PipelineContext = {
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
        stepResults: new Map(),
      };

      const result = await pipeline.runStep('eval', context);

      expect(result.stepId).toBe('eval');
      expect(result.status).toBe('completed');
      expect(context.evalOutput).toBeDefined();
    });

    it('should throw error for unknown step ID', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });

      const context: PipelineContext = {
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
        stepResults: new Map(),
      };

      await expect(pipeline.runStep('unknown-step' as PipelineStepId, context)).rejects.toThrow(
        'Unknown step: unknown-step'
      );
    });

    it('should throw error when dependencies are not met', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });

      const context: PipelineContext = {
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
        stepResults: new Map(),
      };

      await expect(pipeline.runStep('analyze', context)).rejects.toThrow(
        "Step 'analyze' requires 'eval' to complete first"
      );
    });

    it('should allow running step when dependencies are completed', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });

      const context: PipelineContext = {
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
        stepResults: new Map(),
      };

      // Run eval first
      await pipeline.runStep('eval', context);

      // Now trace-collect should work
      const result = await pipeline.runStep('trace-collect', context);

      expect(result.stepId).toBe('trace-collect');
      expect(result.status).toBe('completed');
    });

    it('should allow running step when dependencies are skipped', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({
        executorClient,
        skipSteps: ['trace-collect'],
      });

      const context: PipelineContext = {
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
        stepResults: new Map(),
      };

      // Manually set trace-collect as skipped
      context.stepResults.set('trace-collect', {
        stepId: 'trace-collect',
        status: 'skipped',
        startedAt: new Date().toISOString(),
      });

      // Run eval first
      await pipeline.runStep('eval', context);

      // Analyze depends on eval (which is completed), should work
      const result = await pipeline.runStep('analyze', context);

      expect(result.status).toBe('completed');
    });
  });

  describe('error handling', () => {
    it('should fail pipeline when mandatory step fails', async () => {
      const error = new Error('Eval failed');
      const executorClient: EvalsExecutorClient = {
        runExperiment: jest.fn().mockRejectedValue(error),
        getRanExperiments: jest.fn().mockResolvedValue([]),
      };
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      const result = await controller.result;

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Eval failed');
    });

    it('should continue when optional step fails', async () => {
      const experiment = createMockExperiment();
      const executorClient = createMockExecutorClient(experiment);
      const improvementAnalyzer: ImprovementAnalyzer = {
        analyze: jest.fn().mockRejectedValue(new Error('Analysis failed')),
        analyzeHeuristic: jest.fn(),
        extractDatasetScore: jest.fn(),
        extractExampleDetails: jest.fn(),
        createSummary: jest.fn(),
        mergeResults: jest.fn(),
        analyzeMultiple: jest.fn(),
      } as unknown as ImprovementAnalyzer;

      const pipeline = createPipeline({ executorClient, improvementAnalyzer });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      const result = await controller.result;

      // Pipeline should still succeed because analyze is optional
      expect(result.success).toBe(true);

      const analyzeStep = result.stepResults.find((s) => s.stepId === 'analyze');
      expect(analyzeStep?.status).toBe('failed');
    });

    it('should include step results even for failed steps', async () => {
      const error = new Error('Eval failed');
      const executorClient: EvalsExecutorClient = {
        runExperiment: jest.fn().mockRejectedValue(error),
        getRanExperiments: jest.fn().mockResolvedValue([]),
      };
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      const result = await controller.result;

      // When a non-optional step fails, the error is thrown before stepResults is populated
      // The context.stepResults Map should contain the failed step
      const evalStep = result.context.stepResults.get('eval');
      expect(evalStep?.status).toBe('failed');
      expect(evalStep?.error?.message).toBe('Eval failed');
    });

    it('should record timing for failed steps', async () => {
      const error = new Error('Eval failed');
      const executorClient: EvalsExecutorClient = {
        runExperiment: jest.fn().mockRejectedValue(error),
        getRanExperiments: jest.fn().mockResolvedValue([]),
      };
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      const result = await controller.result;

      // Access from context.stepResults Map since stepResults array may not include failed mandatory step
      const evalStep = result.context.stepResults.get('eval');
      expect(evalStep?.startedAt).toBeDefined();
      expect(evalStep?.completedAt).toBeDefined();
      expect(evalStep?.durationMs).toBeDefined();
    });
  });

  describe('step-specific behavior', () => {
    describe('trace-collect step', () => {
      it('should use default trace collector when none provided', async () => {
        const experiment = createMockExperiment();
        const executorClient = createMockExecutorClient(experiment);
        const pipeline = createPipeline({ executorClient });

        const controller = pipeline.run({
          dataset: createMockDataset(),
          task: createMockTask(),
          evaluators: [createMockEvaluator()],
        });

        const result = await controller.result;

        expect(result.context.traceCollectOutput).toBeDefined();
        expect(result.context.traceCollectOutput?.correlations).toBeDefined();
      });

      it('should use custom trace collector when provided', async () => {
        const customCorrelations = [
          {
            traceId: 'custom-trace-1',
            exampleIndex: 0,
            repetition: 1,
            runKey: 'run-0',
            input: { query: 'test' },
            output: { answer: 'result' },
            evaluationResults: {},
          },
        ];
        const traceCollector = jest.fn().mockResolvedValue(customCorrelations);
        const executorClient = createMockExecutorClient();
        const pipeline = createPipeline({ executorClient, traceCollector });

        const controller = pipeline.run({
          dataset: createMockDataset(),
          task: createMockTask(),
          evaluators: [createMockEvaluator()],
        });

        const result = await controller.result;

        expect(traceCollector).toHaveBeenCalled();
        expect(result.context.traceCollectOutput?.correlations).toEqual(customCorrelations);
      });

      it('should count success and failure correlations', async () => {
        const correlationsWithErrors = [
          {
            traceId: 'trace-1',
            exampleIndex: 0,
            repetition: 1,
            runKey: 'run-0',
            input: {},
            output: {},
            evaluationResults: {},
          },
          {
            traceId: 'trace-2',
            exampleIndex: 1,
            repetition: 1,
            runKey: 'run-1',
            input: {},
            output: {},
            evaluationResults: {},
            traceError: 'Failed to fetch trace',
          },
        ];
        const traceCollector = jest.fn().mockResolvedValue(correlationsWithErrors);
        const executorClient = createMockExecutorClient();
        const pipeline = createPipeline({ executorClient, traceCollector });

        const controller = pipeline.run({
          dataset: createMockDataset(),
          task: createMockTask(),
          evaluators: [createMockEvaluator()],
        });

        const result = await controller.result;

        expect(result.context.traceCollectOutput?.successCount).toBe(1);
        expect(result.context.traceCollectOutput?.failureCount).toBe(1);
      });
    });

    describe('analyze step', () => {
      it('should return empty analysis when no analyzer configured', async () => {
        const executorClient = createMockExecutorClient();
        const pipeline = createPipeline({ executorClient });

        const controller = pipeline.run({
          dataset: createMockDataset(),
          task: createMockTask(),
          evaluators: [createMockEvaluator()],
        });

        const result = await controller.result;

        expect(result.context.analyzeOutput?.analysis.suggestions).toEqual([]);
        expect(result.context.analyzeOutput?.analysis.summary.totalSuggestions).toBe(0);
      });

      it('should pass additionalContext to analyzer', async () => {
        const improvementAnalyzer = createMockImprovementAnalyzer();
        const executorClient = createMockExecutorClient();
        const pipeline = createPipeline({ executorClient, improvementAnalyzer });

        const controller = pipeline.run({
          dataset: createMockDataset(),
          task: createMockTask(),
          evaluators: [createMockEvaluator()],
          additionalContext: 'Custom context for analysis',
        });

        await controller.result;

        expect(improvementAnalyzer.analyze).toHaveBeenCalledWith(
          expect.objectContaining({
            additionalContext: 'Custom context for analysis',
          })
        );
      });
    });

    describe('suggest step', () => {
      it('should sort suggestions by priority score', async () => {
        const analysisResult: ImprovementSuggestionAnalysisResult = {
          suggestions: [
            {
              id: 'low',
              title: 'Low priority',
              description: 'Low',
              category: 'other',
              impact: 'low',
              confidence: 'low',
              evidence: [],
              priorityScore: 0.3,
            },
            {
              id: 'high',
              title: 'High priority',
              description: 'High',
              category: 'accuracy',
              impact: 'high',
              confidence: 'high',
              evidence: [],
              priorityScore: 0.9,
            },
            {
              id: 'medium',
              title: 'Medium priority',
              description: 'Medium',
              category: 'prompt',
              impact: 'medium',
              confidence: 'medium',
              evidence: [],
              priorityScore: 0.6,
            },
          ],
          summary: {
            totalSuggestions: 3,
            byImpact: { high: 1, medium: 1, low: 1 },
            byCategory: {
              prompt: 1,
              tool_selection: 0,
              response_quality: 0,
              context_retrieval: 0,
              reasoning: 0,
              accuracy: 1,
              efficiency: 0,
              other: 1,
            },
            topPriority: [],
          },
          metadata: {
            runId: 'exp-123',
            datasetName: 'Test',
            analyzedAt: new Date().toISOString(),
          },
        };
        const improvementAnalyzer = createMockImprovementAnalyzer(analysisResult);
        const executorClient = createMockExecutorClient();
        const pipeline = createPipeline({ executorClient, improvementAnalyzer });

        const controller = pipeline.run({
          dataset: createMockDataset(),
          task: createMockTask(),
          evaluators: [createMockEvaluator()],
        });

        const result = await controller.result;

        const suggestions = result.context.suggestOutput?.suggestions;
        expect(suggestions?.[0].id).toBe('high');
        expect(suggestions?.[1].id).toBe('medium');
        expect(suggestions?.[2].id).toBe('low');
      });

      it('should count high-impact suggestions', async () => {
        const analysisResult: ImprovementSuggestionAnalysisResult = {
          suggestions: [
            {
              id: '1',
              title: 'High 1',
              description: 'High',
              category: 'accuracy',
              impact: 'high',
              confidence: 'high',
              evidence: [],
            },
            {
              id: '2',
              title: 'High 2',
              description: 'High',
              category: 'prompt',
              impact: 'high',
              confidence: 'high',
              evidence: [],
            },
            {
              id: '3',
              title: 'Low',
              description: 'Low',
              category: 'other',
              impact: 'low',
              confidence: 'low',
              evidence: [],
            },
          ],
          summary: {
            totalSuggestions: 3,
            byImpact: { high: 2, medium: 0, low: 1 },
            byCategory: {
              prompt: 1,
              tool_selection: 0,
              response_quality: 0,
              context_retrieval: 0,
              reasoning: 0,
              accuracy: 1,
              efficiency: 0,
              other: 1,
            },
            topPriority: [],
          },
          metadata: {
            runId: 'exp-123',
            datasetName: 'Test',
            analyzedAt: new Date().toISOString(),
          },
        };
        const improvementAnalyzer = createMockImprovementAnalyzer(analysisResult);
        const executorClient = createMockExecutorClient();
        const pipeline = createPipeline({ executorClient, improvementAnalyzer });

        const controller = pipeline.run({
          dataset: createMockDataset(),
          task: createMockTask(),
          evaluators: [createMockEvaluator()],
        });

        const result = await controller.result;

        expect(result.context.suggestOutput?.highImpactCount).toBe(2);
        expect(result.context.suggestOutput?.suggestionCount).toBe(3);
      });
    });

    describe('report step', () => {
      it('should call custom reporter when provided', async () => {
        const reporter = jest.fn().mockResolvedValue(undefined);
        const executorClient = createMockExecutorClient();
        const pipeline = createPipeline({ executorClient, reporter });

        const controller = pipeline.run({
          dataset: createMockDataset(),
          task: createMockTask(),
          evaluators: [createMockEvaluator()],
        });

        await controller.result;

        expect(reporter).toHaveBeenCalled();
        expect(reporter).toHaveBeenCalledWith(expect.objectContaining({ evalOutput: expect.any(Object) }));
      });

      it('should mark report as complete even without custom reporter', async () => {
        const executorClient = createMockExecutorClient();
        const pipeline = createPipeline({ executorClient });

        const controller = pipeline.run({
          dataset: createMockDataset(),
          task: createMockTask(),
          evaluators: [createMockEvaluator()],
        });

        const result = await controller.result;

        expect(result.context.reportOutput?.reported).toBe(true);
      });
    });
  });

  describe('concurrency configuration', () => {
    it('should pass concurrency to executor client', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient, concurrency: 5 });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      await controller.result;

      expect(executorClient.runExperiment).toHaveBeenCalledWith(
        expect.objectContaining({ concurrency: 5 }),
        expect.any(Array)
      );
    });

    it('should default concurrency to 1', async () => {
      const executorClient = createMockExecutorClient();
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: createMockDataset(),
        task: createMockTask(),
        evaluators: [createMockEvaluator()],
      });

      await controller.result;

      expect(executorClient.runExperiment).toHaveBeenCalledWith(
        expect.objectContaining({ concurrency: 1 }),
        expect.any(Array)
      );
    });
  });
});
