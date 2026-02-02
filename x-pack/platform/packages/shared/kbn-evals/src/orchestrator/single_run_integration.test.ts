/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPipeline, type PipelineStepId } from './pipeline';
import { createFeedbackLoopOrchestrator } from './create_orchestrator';
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
 * Integration tests for end-to-end single run flow with mocked eval suite.
 *
 * These tests verify the complete evaluation flow from dataset creation
 * through task execution, evaluation, analysis, and reporting.
 */
describe('Single Run Integration Tests', () => {
  // ============================================================================
  // Mock Eval Suite Factories
  // ============================================================================

  interface QAExample extends Example {
    input: { question: string; context?: string };
    output: { answer: string; confidence?: number };
    metadata: { difficulty: 'easy' | 'medium' | 'hard' } | null;
  }

  interface QAOutput extends TaskOutput {
    answer: string;
    reasoning?: string;
    sources?: string[];
  }

  /**
   * Creates a comprehensive mock eval suite for integration testing.
   */
  function createMockEvalSuite() {
    const dataset: EvaluationDataset<QAExample> = {
      name: 'QA Integration Test Dataset',
      description: 'A dataset for testing question-answering capabilities',
      examples: [
        {
          input: { question: 'What is the capital of France?', context: 'European geography' },
          output: { answer: 'Paris', confidence: 1.0 },
          metadata: { difficulty: 'easy' },
        },
        {
          input: { question: 'Explain quantum entanglement', context: 'Physics' },
          output: { answer: 'A phenomenon where particles become interconnected', confidence: 0.9 },
          metadata: { difficulty: 'hard' },
        },
        {
          input: { question: 'What is 2 + 2?', context: 'Mathematics' },
          output: { answer: '4', confidence: 1.0 },
          metadata: { difficulty: 'easy' },
        },
        {
          input: { question: 'Who wrote Romeo and Juliet?' },
          output: { answer: 'William Shakespeare', confidence: 1.0 },
          metadata: { difficulty: 'medium' },
        },
        {
          input: { question: 'What is the speed of light?' },
          output: { answer: '299,792,458 meters per second', confidence: 1.0 },
          metadata: { difficulty: 'medium' },
        },
      ],
    };

    const task: ExperimentTask<QAExample, QAOutput> = async (example) => {
      // Simulate task execution with realistic behavior
      await new Promise((resolve) => setTimeout(resolve, 1)); // Minimal delay for timing tests

      const responses: Record<string, QAOutput> = {
        'What is the capital of France?': {
          answer: 'Paris',
          reasoning: 'Paris is the capital and largest city of France.',
          sources: ['geography-db'],
        },
        'Explain quantum entanglement': {
          answer:
            'Quantum entanglement is a phenomenon where two particles become correlated in such a way that the quantum state of one instantly influences the other.',
          reasoning: 'Based on quantum mechanics principles.',
          sources: ['physics-textbook'],
        },
        'What is 2 + 2?': {
          answer: '4',
          reasoning: 'Basic arithmetic operation.',
        },
        'Who wrote Romeo and Juliet?': {
          answer: 'William Shakespeare',
          reasoning: 'Historical literary attribution.',
          sources: ['literature-db'],
        },
        'What is the speed of light?': {
          answer: 'Approximately 299,792,458 meters per second',
          reasoning: 'Physical constant in vacuum.',
          sources: ['physics-constants'],
        },
      };

      return responses[example.input.question] || { answer: 'Unknown' };
    };

    const evaluators: Array<Evaluator<QAExample, QAOutput>> = [
      {
        name: 'CorrectnessEvaluator',
        kind: 'CODE',
        evaluate: async ({ output, expected }) => {
          const outputAnswer = output.answer.toLowerCase();
          const expectedAnswer = expected?.answer?.toLowerCase() || '';

          // Simple string similarity check
          const isCorrect =
            outputAnswer.includes(expectedAnswer) || expectedAnswer.includes(outputAnswer);

          return {
            score: isCorrect ? 1.0 : 0.0,
            label: isCorrect ? 'CORRECT' : 'INCORRECT',
            explanation: isCorrect
              ? 'Output matches expected answer'
              : `Output "${output.answer}" does not match expected "${expected?.answer}"`,
          };
        },
      },
      {
        name: 'CompletenessEvaluator',
        kind: 'CODE',
        evaluate: async ({ output }) => {
          const hasAnswer = !!output.answer && output.answer.length > 0;
          const hasReasoning = !!output.reasoning;
          const hasSources = !!output.sources && output.sources.length > 0;

          const completenessScore =
            [hasAnswer, hasReasoning, hasSources].filter(Boolean).length / 3;

          return {
            score: completenessScore,
            label:
              completenessScore >= 0.66
                ? 'COMPLETE'
                : completenessScore >= 0.33
                ? 'PARTIAL'
                : 'INCOMPLETE',
            explanation: `Answer: ${hasAnswer}, Reasoning: ${hasReasoning}, Sources: ${hasSources}`,
          };
        },
      },
      {
        name: 'ResponseLengthEvaluator',
        kind: 'CODE',
        evaluate: async ({ output }) => {
          const length = output.answer.length;
          // Normalize score based on response length (10-200 chars is ideal)
          const score = Math.min(1, Math.max(0, 1 - Math.abs(length - 100) / 200));

          return {
            score,
            label: length < 10 ? 'TOO_SHORT' : length > 200 ? 'TOO_LONG' : 'APPROPRIATE',
            explanation: `Response length: ${length} characters`,
            metadata: { length },
          };
        },
      },
    ];

    return { dataset, task, evaluators };
  }

  /**
   * Creates a mock experiment result for testing.
   */
  function createMockExperimentResult(
    dataset: EvaluationDataset,
    scores: number[] = [0.9, 0.85, 0.95, 0.88, 0.92]
  ): RanExperiment {
    const runs: RanExperiment['runs'] = {};
    const evaluationRuns: RanExperiment['evaluationRuns'] = [];

    dataset.examples.forEach((example, index) => {
      const runKey = `run-${index}`;
      runs[runKey] = {
        exampleIndex: index,
        repetition: 1,
        input: example.input,
        expected: example.output,
        metadata: example.metadata,
        output: { answer: `Answer for example ${index}` },
        evalThreadId: `trace-${index}`,
      };

      // Add evaluation runs for each evaluator
      ['CorrectnessEvaluator', 'CompletenessEvaluator', 'ResponseLengthEvaluator'].forEach(
        (evaluatorName, evalIndex) => {
          evaluationRuns.push({
            name: evaluatorName,
            runKey,
            exampleIndex: index,
            repetition: 1,
            result: {
              score: scores[index % scores.length] - evalIndex * 0.05,
              label: scores[index % scores.length] >= 0.8 ? 'PASS' : 'FAIL',
              explanation: `Evaluation result for ${evaluatorName}`,
            },
          });
        }
      );
    });

    return {
      id: `exp-${Date.now().toString(36)}`,
      datasetId: 'dataset-integration-test',
      datasetName: dataset.name,
      datasetDescription: dataset.description,
      runs,
      evaluationRuns,
      experimentMetadata: {
        runType: 'integration-test',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Creates a mock executor client for testing.
   */
  function createMockExecutorClient(experimentOverride?: RanExperiment): EvalsExecutorClient {
    return {
      runExperiment: jest
        .fn()
        .mockImplementation((options) =>
          Promise.resolve(experimentOverride ?? createMockExperimentResult(options.dataset))
        ),
      getRanExperiments: jest.fn().mockResolvedValue([]),
    };
  }

  /**
   * Creates a mock improvement analyzer for testing.
   */
  function createMockImprovementAnalyzer(
    suggestions: ImprovementSuggestion[] = []
  ): ImprovementAnalyzer {
    const defaultSuggestions: ImprovementSuggestion[] =
      suggestions.length > 0
        ? suggestions
        : [
            {
              id: 'sug-1',
              title: 'Improve answer completeness',
              description: 'Add more detailed reasoning to responses',
              category: 'response_quality',
              impact: 'high',
              confidence: 'high',
              evidence: [
                {
                  evaluatorName: 'CompletenessEvaluator',
                  exampleIndices: [0, 2],
                  score: 0.66,
                  explanation: 'Missing reasoning or sources',
                },
              ],
              actionItems: ['Include reasoning for each answer', 'Add source citations'],
              priorityScore: 0.85,
              tags: ['completeness', 'reasoning'],
            },
            {
              id: 'sug-2',
              title: 'Optimize response length',
              description: 'Adjust response verbosity for better clarity',
              category: 'efficiency',
              impact: 'medium',
              confidence: 'medium',
              evidence: [
                {
                  evaluatorName: 'ResponseLengthEvaluator',
                  exampleIndices: [1],
                  score: 0.7,
                  explanation: 'Response length outside optimal range',
                },
              ],
              priorityScore: 0.6,
              tags: ['length', 'clarity'],
            },
          ];

    const analysisResult: ImprovementSuggestionAnalysisResult = {
      suggestions: defaultSuggestions,
      summary: {
        totalSuggestions: defaultSuggestions.length,
        byImpact: {
          high: defaultSuggestions.filter((s) => s.impact === 'high').length,
          medium: defaultSuggestions.filter((s) => s.impact === 'medium').length,
          low: defaultSuggestions.filter((s) => s.impact === 'low').length,
        },
        byCategory: {
          prompt: 0,
          tool_selection: 0,
          response_quality: defaultSuggestions.filter((s) => s.category === 'response_quality')
            .length,
          context_retrieval: 0,
          reasoning: 0,
          accuracy: 0,
          efficiency: defaultSuggestions.filter((s) => s.category === 'efficiency').length,
          other: 0,
        },
        topPriority: defaultSuggestions.slice(0, 3),
      },
      metadata: {
        runId: 'exp-integration-test',
        datasetName: 'QA Integration Test Dataset',
        analyzedAt: new Date().toISOString(),
      },
    };

    return {
      analyze: jest.fn().mockResolvedValue(analysisResult),
      analyzeHeuristic: jest.fn().mockReturnValue(analysisResult),
      extractDatasetScore: jest.fn().mockReturnValue({ score: 0.88, count: 5 }),
      extractExampleDetails: jest.fn().mockReturnValue([]),
      createSummary: jest.fn().mockReturnValue(analysisResult.summary),
      mergeResults: jest.fn(),
      analyzeMultiple: jest.fn(),
    } as unknown as ImprovementAnalyzer;
  }

  /**
   * Creates a mock trace collector for testing.
   */
  function createMockTraceCollector(): (
    experiment: RanExperiment
  ) => Promise<EvalTraceCorrelation[]> {
    return jest.fn().mockImplementation(async (experiment: RanExperiment) => {
      const correlations: EvalTraceCorrelation[] = [];

      for (const [runKey, runData] of Object.entries(experiment.runs || {})) {
        correlations.push({
          traceId: runData.evalThreadId || `trace-${runKey}`,
          exampleIndex: runData.exampleIndex,
          repetition: runData.repetition,
          runKey,
          input: runData.input,
          expected: runData.expected,
          output: runData.output,
          evaluationResults: {},
        });
      }

      return correlations;
    });
  }

  // ============================================================================
  // Integration Tests: Pipeline Single Run
  // ============================================================================

  describe('Pipeline End-to-End Single Run', () => {
    it('should execute complete pipeline with all steps for a single run', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const executorClient = createMockExecutorClient();
      const improvementAnalyzer = createMockImprovementAnalyzer();
      const traceCollector = createMockTraceCollector();

      const pipeline = createPipeline({
        executorClient,
        improvementAnalyzer,
        traceCollector,
        concurrency: 1,
      });

      const controller = pipeline.run({
        dataset,
        task,
        evaluators,
        metadata: { testRun: true, runType: 'integration' },
        model: 'test-model',
      });

      const result = await controller.result;

      // Verify pipeline completed successfully
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify all steps executed
      expect(result.stepResults).toHaveLength(5);
      const stepStatuses = result.stepResults.map((s) => ({ id: s.stepId, status: s.status }));
      expect(stepStatuses).toEqual([
        { id: 'eval', status: 'completed' },
        { id: 'trace-collect', status: 'completed' },
        { id: 'analyze', status: 'completed' },
        { id: 'suggest', status: 'completed' },
        { id: 'report', status: 'completed' },
      ]);

      // Verify context outputs are populated
      expect(result.context.evalOutput).toBeDefined();
      expect(result.context.traceCollectOutput).toBeDefined();
      expect(result.context.analyzeOutput).toBeDefined();
      expect(result.context.suggestOutput).toBeDefined();
      expect(result.context.reportOutput).toBeDefined();

      // Verify timing data
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });

    it('should correctly process eval suite data through all pipeline stages', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const experiment = createMockExperimentResult(dataset, [0.95, 0.88, 1.0, 0.92, 0.85]);
      const executorClient = createMockExecutorClient(experiment);
      const improvementAnalyzer = createMockImprovementAnalyzer();

      const pipeline = createPipeline({
        executorClient,
        improvementAnalyzer,
      });

      const controller = pipeline.run({
        dataset,
        task,
        evaluators,
      });

      const result = await controller.result;

      // Verify eval step output
      const evalOutput = result.context.evalOutput;
      expect(evalOutput).toBeDefined();
      expect(evalOutput?.experiment.id).toBe(experiment.id);
      expect(evalOutput?.experiment.datasetName).toBe(dataset.name);
      expect(evalOutput?.meanScore).toBeGreaterThan(0);

      // Verify trace collection
      const traceOutput = result.context.traceCollectOutput;
      expect(traceOutput).toBeDefined();
      expect(traceOutput?.correlations.length).toBe(dataset.examples.length);

      // Verify analysis
      const analyzeOutput = result.context.analyzeOutput;
      expect(analyzeOutput).toBeDefined();
      expect(analyzeOutput?.analysis.suggestions.length).toBeGreaterThan(0);

      // Verify suggestions
      const suggestOutput = result.context.suggestOutput;
      expect(suggestOutput).toBeDefined();
      expect(suggestOutput?.suggestionCount).toBeGreaterThan(0);
    });

    it('should maintain data integrity through pipeline stages', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const executorClient = createMockExecutorClient();
      const improvementAnalyzer = createMockImprovementAnalyzer();

      const pipeline = createPipeline({
        executorClient,
        improvementAnalyzer,
      });

      const inputMetadata = { testId: 'data-integrity-test', timestamp: Date.now() };

      const controller = pipeline.run({
        dataset,
        task,
        evaluators,
        metadata: inputMetadata,
        model: 'integrity-test-model',
      });

      const result = await controller.result;

      // Verify metadata is preserved
      expect(result.context.metadata).toEqual(inputMetadata);
      expect(result.context.model).toBe('integrity-test-model');

      // Verify dataset reference integrity
      expect(result.context.dataset).toBe(dataset);
      expect(result.context.evaluators).toBe(evaluators);
    });

    it('should handle callbacks for monitoring single run progress', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const executorClient = createMockExecutorClient();

      const stepStartCalls: PipelineStepId[] = [];
      const stepCompleteCalls: Array<{ stepId: PipelineStepId; status: string }> = [];

      const pipeline = createPipeline({
        executorClient,
        onStepStart: (stepId) => stepStartCalls.push(stepId),
        onStepComplete: (result) =>
          stepCompleteCalls.push({ stepId: result.stepId, status: result.status }),
      });

      const controller = pipeline.run({
        dataset,
        task,
        evaluators,
      });

      await controller.result;

      // Verify callbacks were invoked in order
      expect(stepStartCalls).toEqual(['eval', 'trace-collect', 'analyze', 'suggest', 'report']);

      expect(stepCompleteCalls).toEqual([
        { stepId: 'eval', status: 'completed' },
        { stepId: 'trace-collect', status: 'completed' },
        { stepId: 'analyze', status: 'completed' },
        { stepId: 'suggest', status: 'completed' },
        { stepId: 'report', status: 'completed' },
      ]);
    });

    it('should correctly calculate mean score from multiple evaluators', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();

      // Create experiment with known scores for verification
      const experiment: RanExperiment = {
        id: 'exp-score-test',
        datasetId: 'dataset-1',
        datasetName: dataset.name,
        runs: {
          'run-0': {
            exampleIndex: 0,
            repetition: 1,
            input: dataset.examples[0].input,
            expected: dataset.examples[0].output,
            metadata: null,
            output: { answer: 'Test' },
          },
        },
        evaluationRuns: [
          { name: 'Eval1', exampleIndex: 0, result: { score: 0.8 } },
          { name: 'Eval2', exampleIndex: 0, result: { score: 0.6 } },
          { name: 'Eval3', exampleIndex: 0, result: { score: 1.0 } },
        ],
      };

      const executorClient = createMockExecutorClient(experiment);
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset,
        task,
        evaluators,
      });

      const result = await controller.result;

      // Mean of [0.8, 0.6, 1.0] = 0.8
      expect(result.context.evalOutput?.meanScore).toBeCloseTo(0.8, 10);
    });
  });

  // ============================================================================
  // Integration Tests: Orchestrator Single Iteration
  // ============================================================================

  describe('Orchestrator Single Iteration', () => {
    it('should execute single iteration through orchestrator', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const executorClient = createMockExecutorClient();
      const improvementAnalyzer = createMockImprovementAnalyzer();

      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        improvementAnalyzer,
        maxIterations: 1,
      });

      const result = await orchestrator.runSingleIteration({
        dataset,
        task,
        evaluators,
        model: 'single-iteration-model',
      });

      // Verify iteration result structure
      expect(result.iteration).toBe(1);
      expect(result.experiment).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.meanScore).toBeGreaterThanOrEqual(0);
      expect(result.improvementFromPrevious).toBe(0); // First iteration has no previous
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });

    it('should properly analyze single iteration results', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const suggestions: ImprovementSuggestion[] = [
        {
          id: 'single-sug-1',
          title: 'Single Run Improvement',
          description: 'Identified from single run analysis',
          category: 'accuracy',
          impact: 'high',
          confidence: 'high',
          evidence: [],
          priorityScore: 0.9,
        },
      ];
      const improvementAnalyzer = createMockImprovementAnalyzer(suggestions);
      const executorClient = createMockExecutorClient();

      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        improvementAnalyzer,
      });

      const result = await orchestrator.runSingleIteration({
        dataset,
        task,
        evaluators,
      });

      // Verify analysis results
      expect(result.analysis.suggestions).toHaveLength(1);
      expect(result.analysis.suggestions[0].title).toBe('Single Run Improvement');
      expect(result.analysis.summary.totalSuggestions).toBe(1);
      expect(result.analysis.summary.byImpact.high).toBe(1);
    });

    it('should handle orchestrator single run with callbacks', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const executorClient = createMockExecutorClient();

      const suggestions: ImprovementSuggestion[] = [
        {
          id: 'cb-sug-1',
          title: 'Callback Test Suggestion',
          description: 'Test',
          category: 'prompt',
          impact: 'medium',
          confidence: 'medium',
          evidence: [],
        },
      ];
      const improvementAnalyzer = createMockImprovementAnalyzer(suggestions);

      const suggestionCallback = jest.fn();
      const iterationCallback = jest.fn();

      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        improvementAnalyzer,
        maxIterations: 1,
        onSuggestion: suggestionCallback,
        onIterationComplete: iterationCallback,
      });

      const controller = orchestrator.run({
        dataset,
        task,
        evaluators,
      });

      await controller.result;

      // Verify callbacks were invoked
      expect(suggestionCallback).toHaveBeenCalledWith(suggestions[0], 1);
      expect(iterationCallback).toHaveBeenCalledWith(expect.objectContaining({ iteration: 1 }));
    });

    it('should correctly pass experiment metadata in single run', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const executorClient = createMockExecutorClient();
      const improvementAnalyzer = createMockImprovementAnalyzer();

      const orchestrator = createFeedbackLoopOrchestrator({
        executorClient,
        improvementAnalyzer,
      });

      const customMetadata = {
        experimentType: 'single-run-test',
        customField: 'customValue',
      };

      await orchestrator.runSingleIteration({
        dataset,
        task,
        evaluators,
        metadata: customMetadata,
      });

      // Verify metadata was passed to executor
      expect(executorClient.runExperiment).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            experimentType: 'single-run-test',
            customField: 'customValue',
            feedbackLoopIteration: 1,
          }),
        }),
        evaluators
      );
    });
  });

  // ============================================================================
  // Integration Tests: Error Handling
  // ============================================================================

  describe('Error Handling in Single Run', () => {
    it('should handle evaluation failures gracefully', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const error = new Error('Evaluation service unavailable');
      const executorClient: EvalsExecutorClient = {
        runExperiment: jest.fn().mockRejectedValue(error),
        getRanExperiments: jest.fn().mockResolvedValue([]),
      };

      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset,
        task,
        evaluators,
      });

      const result = await controller.result;

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Evaluation service unavailable');
    });

    it('should continue with optional step failures', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const executorClient = createMockExecutorClient();

      // Create analyzer that throws an error
      const failingAnalyzer: ImprovementAnalyzer = {
        analyze: jest.fn().mockRejectedValue(new Error('Analysis failed')),
        analyzeHeuristic: jest.fn(),
        extractDatasetScore: jest.fn(),
        extractExampleDetails: jest.fn(),
        createSummary: jest.fn(),
        mergeResults: jest.fn(),
        analyzeMultiple: jest.fn(),
      } as unknown as ImprovementAnalyzer;

      const pipeline = createPipeline({
        executorClient,
        improvementAnalyzer: failingAnalyzer,
      });

      const controller = pipeline.run({
        dataset,
        task,
        evaluators,
      });

      const result = await controller.result;

      // Pipeline should still succeed as analyze is optional
      expect(result.success).toBe(true);

      // Verify analyze step failed but others completed
      const analyzeStep = result.stepResults.find((s) => s.stepId === 'analyze');
      expect(analyzeStep?.status).toBe('failed');

      const evalStep = result.stepResults.find((s) => s.stepId === 'eval');
      expect(evalStep?.status).toBe('completed');
    });

    it('should handle empty dataset gracefully', async () => {
      const emptyDataset: EvaluationDataset = {
        name: 'Empty Dataset',
        description: 'Dataset with no examples',
        examples: [],
      };

      const experiment: RanExperiment = {
        id: 'exp-empty',
        datasetId: 'dataset-empty',
        datasetName: 'Empty Dataset',
        runs: {},
        evaluationRuns: [],
      };

      const executorClient = createMockExecutorClient(experiment);
      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset: emptyDataset,
        task: async () => ({ answer: 'test' }),
        evaluators: [],
      });

      const result = await controller.result;

      expect(result.success).toBe(true);
      expect(result.context.evalOutput?.meanScore).toBe(0);
    });
  });

  // ============================================================================
  // Integration Tests: Pipeline Configuration
  // ============================================================================

  describe('Pipeline Configuration in Single Run', () => {
    it('should respect skip steps configuration', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const executorClient = createMockExecutorClient();

      const pipeline = createPipeline({
        executorClient,
        skipSteps: ['trace-collect', 'analyze', 'suggest'],
      });

      const controller = pipeline.run({
        dataset,
        task,
        evaluators,
      });

      const result = await controller.result;

      expect(result.success).toBe(true);

      const skipped = result.stepResults.filter((s) => s.status === 'skipped');
      expect(skipped).toHaveLength(3);
      expect(skipped.map((s) => s.stepId)).toEqual(['trace-collect', 'analyze', 'suggest']);
    });

    it('should apply concurrency configuration', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const executorClient = createMockExecutorClient();

      const pipeline = createPipeline({
        executorClient,
        concurrency: 3,
      });

      const controller = pipeline.run({
        dataset,
        task,
        evaluators,
      });

      await controller.result;

      expect(executorClient.runExperiment).toHaveBeenCalledWith(
        expect.objectContaining({ concurrency: 3 }),
        expect.any(Array)
      );
    });

    it('should use custom reporter for single run', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const executorClient = createMockExecutorClient();

      const reportData: unknown[] = [];
      const customReporter = jest.fn().mockImplementation(async (context) => {
        reportData.push({
          datasetName: context.dataset.name,
          meanScore: context.evalOutput?.meanScore,
          suggestionCount: context.suggestOutput?.suggestionCount,
        });
      });

      const pipeline = createPipeline({
        executorClient,
        reporter: customReporter,
      });

      const controller = pipeline.run({
        dataset,
        task,
        evaluators,
      });

      await controller.result;

      expect(customReporter).toHaveBeenCalled();
      expect(reportData).toHaveLength(1);
      expect(reportData[0]).toHaveProperty('datasetName', dataset.name);
    });
  });

  // ============================================================================
  // Integration Tests: Complete Flow Verification
  // ============================================================================

  describe('Complete Single Run Flow Verification', () => {
    it('should produce consistent results for deterministic inputs', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const knownScores = [0.9, 0.85, 0.95, 0.88, 0.92];
      const experiment = createMockExperimentResult(dataset, knownScores);
      const executorClient = createMockExecutorClient(experiment);

      const pipeline = createPipeline({ executorClient });

      // Run twice with same inputs
      const result1 = await pipeline.run({ dataset, task, evaluators }).result;
      const result2 = await pipeline.run({ dataset, task, evaluators }).result;

      // Verify consistent mean scores
      expect(result1.context.evalOutput?.meanScore).toBe(result2.context.evalOutput?.meanScore);
    });

    it('should include all necessary data for downstream consumers', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const executorClient = createMockExecutorClient();
      const improvementAnalyzer = createMockImprovementAnalyzer();
      const traceCollector = createMockTraceCollector();

      const pipeline = createPipeline({
        executorClient,
        improvementAnalyzer,
        traceCollector,
      });

      const controller = pipeline.run({
        dataset,
        task,
        evaluators,
        model: 'consumer-test-model',
        additionalContext: 'Additional analysis context',
      });

      const result = await controller.result;

      // Verify all data needed by downstream consumers is present
      expect(result.context).toMatchObject({
        dataset: expect.objectContaining({ name: dataset.name }),
        task: expect.any(Function),
        evaluators: expect.any(Array),
        model: 'consumer-test-model',
        evalOutput: expect.objectContaining({
          experiment: expect.objectContaining({ id: expect.any(String) }),
          meanScore: expect.any(Number),
        }),
        traceCollectOutput: expect.objectContaining({
          correlations: expect.any(Array),
          successCount: expect.any(Number),
        }),
        analyzeOutput: expect.objectContaining({
          analysis: expect.objectContaining({
            suggestions: expect.any(Array),
            summary: expect.any(Object),
          }),
        }),
        suggestOutput: expect.objectContaining({
          suggestions: expect.any(Array),
          suggestionCount: expect.any(Number),
          highImpactCount: expect.any(Number),
        }),
        reportOutput: expect.objectContaining({
          reported: true,
        }),
      });
    });

    it('should track step timing for performance analysis', async () => {
      const { dataset, task, evaluators } = createMockEvalSuite();
      const executorClient = createMockExecutorClient();

      const pipeline = createPipeline({ executorClient });

      const controller = pipeline.run({
        dataset,
        task,
        evaluators,
      });

      const result = await controller.result;

      // Verify all steps have timing data
      for (const step of result.stepResults) {
        expect(step.startedAt).toBeDefined();
        expect(step.completedAt).toBeDefined();
        expect(step.durationMs).toBeGreaterThanOrEqual(0);
        expect(typeof step.durationMs).toBe('number');
      }

      // Verify total duration is sum of step durations (approximately)
      const stepDurationSum = result.stepResults.reduce((sum, s) => sum + (s.durationMs || 0), 0);
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(stepDurationSum * 0.9); // Allow some timing variance
    });
  });
});
