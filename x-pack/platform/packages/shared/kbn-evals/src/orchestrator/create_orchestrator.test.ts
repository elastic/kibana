/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createFeedbackLoopOrchestrator,
  type FeedbackLoopOrchestratorConfig,
  type FeedbackLoopInput,
  type FeedbackLoopIterationResult,
} from './create_orchestrator';
import type {
  RanExperiment,
  EvalsExecutorClient,
  Evaluator,
  EvaluationDataset,
  ImprovementSuggestionAnalysisResult,
  ImprovementSuggestion,
} from '../types';
import type { ImprovementAnalyzer } from '../utils/improvement_analyzer';

describe('createFeedbackLoopOrchestrator', () => {
  const createMockExperiment = (
    overrides: Partial<RanExperiment> = {},
    meanScore?: number
  ): RanExperiment => {
    // Generate evaluation runs that produce the desired mean score
    const score = meanScore ?? 0.85;
    return {
      id: `exp-${Date.now().toString(36)}`,
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
        { name: 'Correctness', exampleIndex: 0, result: { score, label: 'PASS' } },
        { name: 'Correctness', exampleIndex: 1, result: { score, label: 'PASS' } },
      ],
      ...overrides,
    };
  };

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

  const createMockExecutorClient = (
    experimentFactory?: () => RanExperiment
  ): EvalsExecutorClient => ({
    runExperiment: jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(experimentFactory ? experimentFactory() : createMockExperiment())
      ),
    getRanExperiments: jest.fn().mockResolvedValue([]),
  });

  const createMockAnalysisResult = (
    suggestions: ImprovementSuggestion[] = []
  ): ImprovementSuggestionAnalysisResult => ({
    suggestions,
    summary: {
      totalSuggestions: suggestions.length,
      byImpact: {
        high: suggestions.filter((s) => s.impact === 'high').length,
        medium: suggestions.filter((s) => s.impact === 'medium').length,
        low: suggestions.filter((s) => s.impact === 'low').length,
      },
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

  const createMockInput = (): FeedbackLoopInput => ({
    dataset: createMockDataset(),
    task: createMockTask(),
    evaluators: [createMockEvaluator()],
  });

  describe('orchestrator structure', () => {
    it('should create an orchestrator with expected interface', () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      expect(orchestrator).toHaveProperty('run');
      expect(orchestrator).toHaveProperty('runSingleIteration');
      expect(orchestrator).toHaveProperty('analyzeExperiment');
      expect(orchestrator).toHaveProperty('compareIterations');
      expect(orchestrator).toHaveProperty('getAnalyzer');
      expect(orchestrator).toHaveProperty('calculateMeanScore');

      expect(typeof orchestrator.run).toBe('function');
      expect(typeof orchestrator.runSingleIteration).toBe('function');
      expect(typeof orchestrator.analyzeExperiment).toBe('function');
      expect(typeof orchestrator.compareIterations).toBe('function');
      expect(typeof orchestrator.getAnalyzer).toBe('function');
      expect(typeof orchestrator.calculateMeanScore).toBe('function');
    });

    it('should return the improvement analyzer via getAnalyzer()', () => {
      const improvementAnalyzer = createMockImprovementAnalyzer();
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        improvementAnalyzer,
      });

      expect(orchestrator.getAnalyzer()).toBe(improvementAnalyzer);
    });
  });

  describe('calculateMeanScore()', () => {
    it('should calculate mean score from evaluation runs', () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'Test', exampleIndex: 0, result: { score: 0.8 } },
          { name: 'Test', exampleIndex: 1, result: { score: 0.6 } },
        ],
      });

      const meanScore = orchestrator.calculateMeanScore(experiment);

      expect(meanScore).toBe(0.7);
    });

    it('should return 0 for empty evaluation runs', () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const experiment = createMockExperiment({ evaluationRuns: [] });

      const meanScore = orchestrator.calculateMeanScore(experiment);

      expect(meanScore).toBe(0);
    });

    it('should return 0 for undefined evaluation runs', () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const experiment = createMockExperiment({
        evaluationRuns: undefined as unknown as RanExperiment['evaluationRuns'],
      });

      const meanScore = orchestrator.calculateMeanScore(experiment);

      expect(meanScore).toBe(0);
    });

    it('should filter out null scores', () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'Test', exampleIndex: 0, result: { score: null } },
          { name: 'Test', exampleIndex: 1, result: { score: 0.8 } },
        ],
      });

      const meanScore = orchestrator.calculateMeanScore(experiment);

      expect(meanScore).toBe(0.8);
    });

    it('should return 0 when all scores are null', () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'Test', exampleIndex: 0, result: { score: null } },
          { name: 'Test', exampleIndex: 1, result: { score: null } },
        ],
      });

      const meanScore = orchestrator.calculateMeanScore(experiment);

      expect(meanScore).toBe(0);
    });
  });

  describe('run()', () => {
    it('should return a controller with expected interface', () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const controller = orchestrator.run(createMockInput());

      expect(controller).toHaveProperty('result');
      expect(controller).toHaveProperty('stop');
      expect(controller).toHaveProperty('isStopping');
      expect(controller.result).toBeInstanceOf(Promise);
      expect(typeof controller.stop).toBe('function');
      expect(typeof controller.isStopping).toBe('function');
    });

    it('should run iterations up to maxIterations', async () => {
      let iterationCount = 0;
      const experimentFactory = () => {
        iterationCount++;
        // Progressively improve to ensure all iterations run
        return createMockExperiment({}, 0.5 + iterationCount * 0.1);
      };

      const executorClient = createMockExecutorClient(experimentFactory);
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        maxIterations: 3,
      });

      const result = await orchestrator.run(createMockInput()).result;

      expect(result.totalIterations).toBe(3);
      expect(result.iterations).toHaveLength(3);
      expect(result.terminationReason).toBe('max_iterations');
    });

    it('should stop when no improvement is detected', async () => {
      let iterationCount = 0;
      const experimentFactory = () => {
        iterationCount++;
        // Score decreases after first iteration
        const score = iterationCount === 1 ? 0.8 : 0.7;
        return createMockExperiment({}, score);
      };

      const executorClient = createMockExecutorClient(experimentFactory);
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        maxIterations: 5,
      });

      const result = await orchestrator.run(createMockInput()).result;

      expect(result.terminationReason).toBe('no_improvement');
      expect(result.totalIterations).toBe(2);
    });

    it('should stop when improvement is below threshold (converged)', async () => {
      let iterationCount = 0;
      const experimentFactory = () => {
        iterationCount++;
        // Score improves slightly but below threshold
        const score = 0.8 + iterationCount * 0.001;
        return createMockExperiment({}, score);
      };

      const executorClient = createMockExecutorClient(experimentFactory);
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        maxIterations: 5,
        minImprovementThreshold: 0.01,
      });

      const result = await orchestrator.run(createMockInput()).result;

      expect(result.terminationReason).toBe('converged');
    });

    it('should stop when manually stopped', async () => {
      let resolveExperiment: (value: RanExperiment) => void;
      const experimentPromise = new Promise<RanExperiment>((resolve) => {
        resolveExperiment = resolve;
      });

      const executorClient: EvalsExecutorClient = {
        runExperiment: jest.fn().mockReturnValue(experimentPromise),
        getRanExperiments: jest.fn().mockResolvedValue([]),
      };

      const improvementAnalyzer = createMockImprovementAnalyzer();
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        improvementAnalyzer,
        maxIterations: 5,
      });

      const controller = orchestrator.run(createMockInput());

      // Stop immediately
      controller.stop();

      // Resolve the experiment
      resolveExperiment!(createMockExperiment());

      const result = await controller.result;

      expect(controller.isStopping()).toBe(true);
      expect(result.terminationReason).toBe('manual_stop');
    });

    it('should calculate total improvement correctly', async () => {
      let iterationCount = 0;
      const experimentFactory = () => {
        iterationCount++;
        // Score improves with each iteration
        const score = 0.5 + iterationCount * 0.1;
        return createMockExperiment({}, score);
      };

      const executorClient = createMockExecutorClient(experimentFactory);
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        maxIterations: 3,
        minImprovementThreshold: 0.05,
      });

      const result = await orchestrator.run(createMockInput()).result;

      expect(result.initialScore).toBe(0.6);
      expect(result.finalScore).toBe(0.8);
      expect(result.totalImprovement).toBeCloseTo(0.2);
    });

    it('should collect unique suggestions across iterations', async () => {
      let analyzeCallCount = 0;
      let experimentCallCount = 0;
      const analysisResults: ImprovementSuggestionAnalysisResult[] = [
        createMockAnalysisResult([
          {
            id: '1',
            title: 'Suggestion A',
            description: 'Desc A',
            category: 'prompt',
            impact: 'high',
            confidence: 'high',
            evidence: [],
            priorityScore: 0.9,
          },
          {
            id: '2',
            title: 'Suggestion B',
            description: 'Desc B',
            category: 'accuracy',
            impact: 'medium',
            confidence: 'medium',
            evidence: [],
            priorityScore: 0.6,
          },
        ]),
        createMockAnalysisResult([
          {
            id: '3',
            title: 'Suggestion A', // Duplicate title
            description: 'Desc A updated',
            category: 'prompt',
            impact: 'high',
            confidence: 'high',
            evidence: [],
            priorityScore: 0.85,
          },
          {
            id: '4',
            title: 'Suggestion C', // New suggestion
            description: 'Desc C',
            category: 'reasoning',
            impact: 'low',
            confidence: 'low',
            evidence: [],
            priorityScore: 0.3,
          },
        ]),
      ];

      const improvementAnalyzer: ImprovementAnalyzer = {
        analyze: jest.fn().mockImplementation(() => {
          const result = analysisResults[analyzeCallCount] || createMockAnalysisResult();
          analyzeCallCount++;
          return Promise.resolve(result);
        }),
        analyzeHeuristic: jest.fn(),
        extractDatasetScore: jest.fn(),
        extractExampleDetails: jest.fn().mockReturnValue([]),
        createSummary: jest.fn(),
        mergeResults: jest.fn(),
        analyzeMultiple: jest.fn(),
      } as unknown as ImprovementAnalyzer;

      const experimentFactory = () => {
        experimentCallCount++;
        // Ensure enough improvement to run both iterations
        return createMockExperiment({}, 0.5 + experimentCallCount * 0.1);
      };

      const executorClient = createMockExecutorClient(experimentFactory);
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        improvementAnalyzer,
        maxIterations: 2,
      });

      const result = await orchestrator.run(createMockInput()).result;

      // Should deduplicate by title (case-insensitive)
      expect(result.allSuggestions).toHaveLength(3);
      expect(result.allSuggestions.map((s) => s.title)).toContain('Suggestion A');
      expect(result.allSuggestions.map((s) => s.title)).toContain('Suggestion B');
      expect(result.allSuggestions.map((s) => s.title)).toContain('Suggestion C');
    });

    it('should sort suggestions by priority score', async () => {
      const analysisResult = createMockAnalysisResult([
        {
          id: '1',
          title: 'Low',
          description: 'Low priority',
          category: 'other',
          impact: 'low',
          confidence: 'low',
          evidence: [],
          priorityScore: 0.3,
        },
        {
          id: '2',
          title: 'High',
          description: 'High priority',
          category: 'accuracy',
          impact: 'high',
          confidence: 'high',
          evidence: [],
          priorityScore: 0.9,
        },
      ]);

      const improvementAnalyzer = createMockImprovementAnalyzer(analysisResult);
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        improvementAnalyzer,
        maxIterations: 1,
      });

      const result = await orchestrator.run(createMockInput()).result;

      expect(result.allSuggestions[0].title).toBe('High');
      expect(result.allSuggestions[1].title).toBe('Low');
    });

    it('should calculate total duration', async () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        maxIterations: 2,
      });

      const result = await orchestrator.run(createMockInput()).result;

      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.totalDurationMs).toBe(
        result.iterations.reduce((sum, iter) => sum + iter.durationMs, 0)
      );
    });
  });

  describe('callbacks', () => {
    it('should call onSuggestion for each suggestion', async () => {
      const onSuggestion = jest.fn();
      const suggestions: ImprovementSuggestion[] = [
        {
          id: '1',
          title: 'Suggestion 1',
          description: 'Desc 1',
          category: 'prompt',
          impact: 'high',
          confidence: 'high',
          evidence: [],
        },
        {
          id: '2',
          title: 'Suggestion 2',
          description: 'Desc 2',
          category: 'accuracy',
          impact: 'medium',
          confidence: 'medium',
          evidence: [],
        },
      ];
      const analysisResult = createMockAnalysisResult(suggestions);
      const improvementAnalyzer = createMockImprovementAnalyzer(analysisResult);
      const executorClient = createMockExecutorClient();

      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        improvementAnalyzer,
        maxIterations: 1,
        onSuggestion,
      });

      await orchestrator.run(createMockInput()).result;

      expect(onSuggestion).toHaveBeenCalledTimes(2);
      expect(onSuggestion).toHaveBeenCalledWith(suggestions[0], 1);
      expect(onSuggestion).toHaveBeenCalledWith(suggestions[1], 1);
    });

    it('should call onIterationComplete after each iteration', async () => {
      const onIterationComplete = jest.fn();
      const executorClient = createMockExecutorClient();

      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        maxIterations: 2,
        onIterationComplete,
      });

      await orchestrator.run(createMockInput()).result;

      expect(onIterationComplete).toHaveBeenCalledTimes(2);
      expect(onIterationComplete).toHaveBeenCalledWith(
        expect.objectContaining({ iteration: 1 })
      );
      expect(onIterationComplete).toHaveBeenCalledWith(
        expect.objectContaining({ iteration: 2 })
      );
    });

    it('should include correct iteration data in callback', async () => {
      const onIterationComplete = jest.fn();
      const executorClient = createMockExecutorClient();

      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        maxIterations: 1,
        onIterationComplete,
      });

      await orchestrator.run(createMockInput()).result;

      const iterationResult = onIterationComplete.mock.calls[0][0] as FeedbackLoopIterationResult;

      expect(iterationResult.iteration).toBe(1);
      expect(iterationResult.experiment).toBeDefined();
      expect(iterationResult.analysis).toBeDefined();
      expect(iterationResult.meanScore).toBeDefined();
      expect(iterationResult.improvementFromPrevious).toBe(0); // First iteration
      expect(iterationResult.startedAt).toBeDefined();
      expect(iterationResult.completedAt).toBeDefined();
      expect(iterationResult.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runSingleIteration()', () => {
    it('should run a single iteration', async () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const result = await orchestrator.runSingleIteration(createMockInput());

      expect(result.iteration).toBe(1);
      expect(result.experiment).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.improvementFromPrevious).toBe(0);
    });

    it('should accept custom iteration number', async () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const result = await orchestrator.runSingleIteration(createMockInput(), 5);

      expect(result.iteration).toBe(5);
    });

    it('should calculate improvement from previous score', async () => {
      const executorClient = createMockExecutorClient(() => createMockExperiment({}, 0.8));
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const result = await orchestrator.runSingleIteration(createMockInput(), 2, 0.7);

      expect(result.improvementFromPrevious).toBeCloseTo(0.1);
    });

    it('should include metadata in experiment', async () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const input = {
        ...createMockInput(),
        metadata: { customKey: 'customValue' },
      };

      await orchestrator.runSingleIteration(input, 3);

      expect(executorClient.runExperiment).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            customKey: 'customValue',
            feedbackLoopIteration: 3,
          }),
        }),
        expect.any(Array)
      );
    });
  });

  describe('analyzeExperiment()', () => {
    it('should analyze an existing experiment', async () => {
      const experiment = createMockExperiment();
      const analysisResult = createMockAnalysisResult();
      const improvementAnalyzer = createMockImprovementAnalyzer(analysisResult);
      const executorClient = createMockExecutorClient();

      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        improvementAnalyzer,
      });

      const result = await orchestrator.analyzeExperiment(experiment);

      expect(result).toBe(analysisResult);
      expect(improvementAnalyzer.analyze).toHaveBeenCalledWith({ experiment });
    });

    it('should pass model option to analyzer', async () => {
      const experiment = createMockExperiment();
      const improvementAnalyzer = createMockImprovementAnalyzer();
      const executorClient = createMockExecutorClient();

      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        improvementAnalyzer,
      });

      await orchestrator.analyzeExperiment(experiment, { model: 'gpt-4' });

      expect(improvementAnalyzer.analyze).toHaveBeenCalledWith({
        experiment,
        model: 'gpt-4',
      });
    });

    it('should pass additionalContext to analyzer', async () => {
      const experiment = createMockExperiment();
      const improvementAnalyzer = createMockImprovementAnalyzer();
      const executorClient = createMockExecutorClient();

      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        improvementAnalyzer,
      });

      await orchestrator.analyzeExperiment(experiment, {
        additionalContext: 'Custom analysis context',
      });

      expect(improvementAnalyzer.analyze).toHaveBeenCalledWith({
        experiment,
        additionalContext: 'Custom analysis context',
      });
    });
  });

  describe('compareIterations()', () => {
    it('should calculate score delta and percentage change', () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const before: FeedbackLoopIterationResult = {
        iteration: 1,
        experiment: createMockExperiment(),
        analysis: createMockAnalysisResult(),
        meanScore: 0.5,
        improvementFromPrevious: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 100,
      };

      const after: FeedbackLoopIterationResult = {
        iteration: 2,
        experiment: createMockExperiment(),
        analysis: createMockAnalysisResult(),
        meanScore: 0.75,
        improvementFromPrevious: 0.25,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 100,
      };

      const comparison = orchestrator.compareIterations(before, after);

      expect(comparison.scoreDelta).toBe(0.25);
      expect(comparison.percentageChange).toBe(50); // (0.25/0.5) * 100
    });

    it('should handle zero initial score', () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const before: FeedbackLoopIterationResult = {
        iteration: 1,
        experiment: createMockExperiment(),
        analysis: createMockAnalysisResult(),
        meanScore: 0,
        improvementFromPrevious: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 100,
      };

      const after: FeedbackLoopIterationResult = {
        iteration: 2,
        experiment: createMockExperiment(),
        analysis: createMockAnalysisResult(),
        meanScore: 0.5,
        improvementFromPrevious: 0.5,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 100,
      };

      const comparison = orchestrator.compareIterations(before, after);

      expect(comparison.scoreDelta).toBe(0.5);
      expect(comparison.percentageChange).toBe(100); // Positive improvement from 0
    });

    it('should handle negative improvement from zero score', () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const before: FeedbackLoopIterationResult = {
        iteration: 1,
        experiment: createMockExperiment(),
        analysis: createMockAnalysisResult(),
        meanScore: 0,
        improvementFromPrevious: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 100,
      };

      const after: FeedbackLoopIterationResult = {
        iteration: 2,
        experiment: createMockExperiment(),
        analysis: createMockAnalysisResult(),
        meanScore: 0,
        improvementFromPrevious: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 100,
      };

      const comparison = orchestrator.compareIterations(before, after);

      expect(comparison.scoreDelta).toBe(0);
      expect(comparison.percentageChange).toBe(0);
    });

    it('should identify new suggestions', () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const beforeAnalysis = createMockAnalysisResult([
        {
          id: '1',
          title: 'Old Suggestion',
          description: 'Old',
          category: 'prompt',
          impact: 'high',
          confidence: 'high',
          evidence: [],
        },
      ]);

      const afterAnalysis = createMockAnalysisResult([
        {
          id: '1',
          title: 'Old Suggestion',
          description: 'Old',
          category: 'prompt',
          impact: 'high',
          confidence: 'high',
          evidence: [],
        },
        {
          id: '2',
          title: 'New Suggestion',
          description: 'New',
          category: 'accuracy',
          impact: 'medium',
          confidence: 'medium',
          evidence: [],
        },
      ]);

      const before: FeedbackLoopIterationResult = {
        iteration: 1,
        experiment: createMockExperiment(),
        analysis: beforeAnalysis,
        meanScore: 0.5,
        improvementFromPrevious: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 100,
      };

      const after: FeedbackLoopIterationResult = {
        iteration: 2,
        experiment: createMockExperiment(),
        analysis: afterAnalysis,
        meanScore: 0.6,
        improvementFromPrevious: 0.1,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 100,
      };

      const comparison = orchestrator.compareIterations(before, after);

      expect(comparison.newSuggestions).toHaveLength(1);
      expect(comparison.newSuggestions[0].title).toBe('New Suggestion');
    });

    it('should identify resolved suggestions', () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const beforeAnalysis = createMockAnalysisResult([
        {
          id: '1',
          title: 'Resolved Suggestion',
          description: 'Will be resolved',
          category: 'prompt',
          impact: 'high',
          confidence: 'high',
          evidence: [],
        },
        {
          id: '2',
          title: 'Remaining Suggestion',
          description: 'Will remain',
          category: 'accuracy',
          impact: 'medium',
          confidence: 'medium',
          evidence: [],
        },
      ]);

      const afterAnalysis = createMockAnalysisResult([
        {
          id: '2',
          title: 'Remaining Suggestion',
          description: 'Still here',
          category: 'accuracy',
          impact: 'medium',
          confidence: 'medium',
          evidence: [],
        },
      ]);

      const before: FeedbackLoopIterationResult = {
        iteration: 1,
        experiment: createMockExperiment(),
        analysis: beforeAnalysis,
        meanScore: 0.5,
        improvementFromPrevious: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 100,
      };

      const after: FeedbackLoopIterationResult = {
        iteration: 2,
        experiment: createMockExperiment(),
        analysis: afterAnalysis,
        meanScore: 0.7,
        improvementFromPrevious: 0.2,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 100,
      };

      const comparison = orchestrator.compareIterations(before, after);

      expect(comparison.resolvedSuggestions).toHaveLength(1);
      expect(comparison.resolvedSuggestions[0].title).toBe('Resolved Suggestion');
    });

    it('should be case-insensitive when comparing suggestion titles', () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const beforeAnalysis = createMockAnalysisResult([
        {
          id: '1',
          title: 'Same Suggestion',
          description: 'Original',
          category: 'prompt',
          impact: 'high',
          confidence: 'high',
          evidence: [],
        },
      ]);

      const afterAnalysis = createMockAnalysisResult([
        {
          id: '1',
          title: 'same suggestion', // Different case
          description: 'Updated',
          category: 'prompt',
          impact: 'high',
          confidence: 'high',
          evidence: [],
        },
      ]);

      const before: FeedbackLoopIterationResult = {
        iteration: 1,
        experiment: createMockExperiment(),
        analysis: beforeAnalysis,
        meanScore: 0.5,
        improvementFromPrevious: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 100,
      };

      const after: FeedbackLoopIterationResult = {
        iteration: 2,
        experiment: createMockExperiment(),
        analysis: afterAnalysis,
        meanScore: 0.6,
        improvementFromPrevious: 0.1,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 100,
      };

      const comparison = orchestrator.compareIterations(before, after);

      expect(comparison.newSuggestions).toHaveLength(0);
      expect(comparison.resolvedSuggestions).toHaveLength(0);
    });
  });

  describe('configuration', () => {
    it('should use default maxIterations of 5', async () => {
      let iterationCount = 0;
      const experimentFactory = () => {
        iterationCount++;
        // Keep improving to reach max
        return createMockExperiment({}, 0.5 + iterationCount * 0.05);
      };

      const executorClient = createMockExecutorClient(experimentFactory);
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      const result = await orchestrator.run(createMockInput()).result;

      expect(result.totalIterations).toBe(5);
      expect(result.terminationReason).toBe('max_iterations');
    });

    it('should use default minImprovementThreshold of 0.01', async () => {
      let iterationCount = 0;
      const experimentFactory = () => {
        iterationCount++;
        // Improve by exactly 0.01 on second iteration, then less
        if (iterationCount === 1) return createMockExperiment({}, 0.5);
        if (iterationCount === 2) return createMockExperiment({}, 0.51);
        return createMockExperiment({}, 0.515); // 0.005 improvement, below threshold
      };

      const executorClient = createMockExecutorClient(experimentFactory);
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        maxIterations: 5,
      });

      const result = await orchestrator.run(createMockInput()).result;

      expect(result.terminationReason).toBe('converged');
      expect(result.totalIterations).toBe(3);
    });

    it('should use default concurrency of 1', async () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({ executorClient });

      await orchestrator.runSingleIteration(createMockInput());

      expect(executorClient.runExperiment).toHaveBeenCalledWith(
        expect.objectContaining({ concurrency: 1 }),
        expect.any(Array)
      );
    });

    it('should respect custom concurrency', async () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        concurrency: 4,
      });

      await orchestrator.runSingleIteration(createMockInput());

      expect(executorClient.runExperiment).toHaveBeenCalledWith(
        expect.objectContaining({ concurrency: 4 }),
        expect.any(Array)
      );
    });

    it('should create analyzer from analyzerConfig when not provided directly', async () => {
      const executorClient = createMockExecutorClient();

      // Not providing improvementAnalyzer should create one from config
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        analyzerConfig: {
          enableHeuristics: true,
          lowScoreThreshold: 0.8,
        },
      });

      // The analyzer should be created successfully
      expect(orchestrator.getAnalyzer()).toBeDefined();
    });
  });

  describe('iteration result structure', () => {
    it('should include all expected fields in iteration result', async () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        maxIterations: 1,
      });

      const result = await orchestrator.run(createMockInput()).result;

      const iteration = result.iterations[0];

      expect(iteration).toHaveProperty('iteration');
      expect(iteration).toHaveProperty('experiment');
      expect(iteration).toHaveProperty('analysis');
      expect(iteration).toHaveProperty('meanScore');
      expect(iteration).toHaveProperty('improvementFromPrevious');
      expect(iteration).toHaveProperty('startedAt');
      expect(iteration).toHaveProperty('completedAt');
      expect(iteration).toHaveProperty('durationMs');

      expect(typeof iteration.iteration).toBe('number');
      expect(typeof iteration.meanScore).toBe('number');
      expect(typeof iteration.improvementFromPrevious).toBe('number');
      expect(typeof iteration.durationMs).toBe('number');
      expect(typeof iteration.startedAt).toBe('string');
      expect(typeof iteration.completedAt).toBe('string');
    });

    it('should have correct iteration numbers (1-based)', async () => {
      let iterationCount = 0;
      const experimentFactory = () => {
        iterationCount++;
        // Progressively improve to ensure all iterations run
        return createMockExperiment({}, 0.5 + iterationCount * 0.1);
      };

      const executorClient = createMockExecutorClient(experimentFactory);
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        maxIterations: 3,
      });

      const result = await orchestrator.run(createMockInput()).result;

      expect(result.iterations[0].iteration).toBe(1);
      expect(result.iterations[1].iteration).toBe(2);
      expect(result.iterations[2].iteration).toBe(3);
    });
  });

  describe('feedback loop result structure', () => {
    it('should include all expected fields in final result', async () => {
      const executorClient = createMockExecutorClient();
      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        maxIterations: 1,
      });

      const result = await orchestrator.run(createMockInput()).result;

      expect(result).toHaveProperty('iterations');
      expect(result).toHaveProperty('totalIterations');
      expect(result).toHaveProperty('initialScore');
      expect(result).toHaveProperty('finalScore');
      expect(result).toHaveProperty('totalImprovement');
      expect(result).toHaveProperty('allSuggestions');
      expect(result).toHaveProperty('terminationReason');
      expect(result).toHaveProperty('totalDurationMs');

      expect(Array.isArray(result.iterations)).toBe(true);
      expect(Array.isArray(result.allSuggestions)).toBe(true);
      expect(typeof result.totalIterations).toBe('number');
      expect(typeof result.initialScore).toBe('number');
      expect(typeof result.finalScore).toBe('number');
      expect(typeof result.totalImprovement).toBe('number');
      expect(typeof result.totalDurationMs).toBe('number');
    });
  });
});
