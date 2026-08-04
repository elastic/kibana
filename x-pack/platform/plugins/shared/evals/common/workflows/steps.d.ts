import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
export declare const modelSchema: z.ZodObject<{
    id: z.ZodString;
    family: z.ZodOptional<z.ZodString>;
    provider: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const exampleSchema: z.ZodObject<{
    id: z.ZodString;
    index: z.ZodOptional<z.ZodNumber>;
    input: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    output: z.ZodOptional<z.ZodUnknown>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, z.core.$strip>;
export declare const datasetSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    examples: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        index: z.ZodOptional<z.ZodNumber>;
        input: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        output: z.ZodOptional<z.ZodUnknown>;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const evaluatorConfigSchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    connector_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const evaluatorResultSchema: z.ZodObject<{
    evaluator: z.ZodObject<{
        name: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodEnum<{
            code: "code";
            llm: "llm";
        }>>;
    }, z.core.$strip>;
    scores: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        explanation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        trace_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ResolveDatasetStepId: "ai.evals.resolveDataset";
export declare const resolveDatasetInputSchema: z.ZodObject<{
    dataset_ids: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const resolveDatasetOutputSchema: z.ZodObject<{
    datasets: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        examples: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            index: z.ZodOptional<z.ZodNumber>;
            input: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            output: z.ZodOptional<z.ZodUnknown>;
            metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const resolveDatasetCommonDefinition: CommonStepDefinition<typeof resolveDatasetInputSchema, typeof resolveDatasetOutputSchema>;
export declare const ExecuteTaskStepId: "ai.evals.executeTask";
export declare const executeTaskInputSchema: z.ZodObject<{
    example: z.ZodObject<{
        id: z.ZodString;
        index: z.ZodOptional<z.ZodNumber>;
        input: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        output: z.ZodOptional<z.ZodUnknown>;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    }, z.core.$strip>;
    connector_id: z.ZodString;
    agent_id: z.ZodOptional<z.ZodString>;
    task_ref: z.ZodOptional<z.ZodString>;
    params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const executeTaskOutputSchema: z.ZodObject<{
    output: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    trace_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const executeTaskCommonDefinition: CommonStepDefinition<typeof executeTaskInputSchema, typeof executeTaskOutputSchema>;
export declare const EvaluateTraceStepId: "ai.evals.evaluateTrace";
export declare const evaluateTraceInputSchema: z.ZodObject<{
    trace_id: z.ZodString;
    reference_data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    evaluators: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
        connector_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const evaluateTraceOutputSchema: z.ZodObject<{
    results: z.ZodArray<z.ZodObject<{
        evaluator: z.ZodObject<{
            name: z.ZodString;
            version: z.ZodOptional<z.ZodString>;
            kind: z.ZodOptional<z.ZodEnum<{
                code: "code";
                llm: "llm";
            }>>;
        }, z.core.$strip>;
        scores: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            explanation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            trace_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    errors: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const evaluateTraceCommonDefinition: CommonStepDefinition<typeof evaluateTraceInputSchema, typeof evaluateTraceOutputSchema>;
export declare const IngestScoresStepId: "ai.evals.ingestScores";
export declare const ingestScoresInputSchema: z.ZodObject<{
    experiment_id: z.ZodString;
    experiment_name: z.ZodOptional<z.ZodString>;
    execution_id: z.ZodOptional<z.ZodString>;
    suite_id: z.ZodOptional<z.ZodString>;
    task_model: z.ZodObject<{
        id: z.ZodString;
        family: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    evaluator_model: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        family: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    total_repetitions: z.ZodOptional<z.ZodNumber>;
    example: z.ZodObject<{
        id: z.ZodString;
        index: z.ZodNumber;
        input: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        dataset: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>;
    task: z.ZodObject<{
        trace_id: z.ZodOptional<z.ZodString>;
        repetition_index: z.ZodNumber;
        output: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
    evaluator_results: z.ZodArray<z.ZodObject<{
        evaluator: z.ZodObject<{
            name: z.ZodString;
            version: z.ZodOptional<z.ZodString>;
            kind: z.ZodOptional<z.ZodEnum<{
                code: "code";
                llm: "llm";
            }>>;
        }, z.core.$strip>;
        scores: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            explanation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            trace_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    space_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const ingestScoresOutputSchema: z.ZodObject<{
    ingested: z.ZodNumber;
    conflicted: z.ZodNumber;
    failed: z.ZodNumber;
}, z.core.$strip>;
export declare const ingestScoresCommonDefinition: CommonStepDefinition<typeof ingestScoresInputSchema, typeof ingestScoresOutputSchema>;
export declare const EvaluateExampleStepId: "ai.evals.evaluateExample";
export declare const evaluateExampleInputSchema: z.ZodObject<{
    experiment_id: z.ZodString;
    experiment_name: z.ZodOptional<z.ZodString>;
    execution_id: z.ZodOptional<z.ZodString>;
    suite_id: z.ZodOptional<z.ZodString>;
    task_model: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        family: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    dataset: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, z.core.$strip>;
    example: z.ZodObject<{
        id: z.ZodString;
        index: z.ZodOptional<z.ZodNumber>;
        input: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        output: z.ZodOptional<z.ZodUnknown>;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    }, z.core.$strip>;
    evaluators: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
        connector_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    reference_data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    repetitions: z.ZodOptional<z.ZodNumber>;
    space_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    connector_id: z.ZodString;
    agent_id: z.ZodOptional<z.ZodString>;
    task_ref: z.ZodOptional<z.ZodString>;
    params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const evaluateExampleOutputSchema: z.ZodObject<{
    scores_ingested: z.ZodNumber;
    failed: z.ZodNumber;
    repetitions: z.ZodNumber;
    errors: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const evaluateExampleCommonDefinition: CommonStepDefinition<typeof evaluateExampleInputSchema, typeof evaluateExampleOutputSchema>;
export declare const EvaluateDatasetStepId: "ai.evals.evaluateDataset";
export declare const evaluateDatasetInputSchema: z.ZodObject<{
    experiment_id: z.ZodString;
    experiment_name: z.ZodOptional<z.ZodString>;
    execution_id: z.ZodOptional<z.ZodString>;
    suite_id: z.ZodOptional<z.ZodString>;
    task_model: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        family: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    dataset_ids: z.ZodArray<z.ZodString>;
    evaluators: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
        connector_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    repetitions: z.ZodOptional<z.ZodNumber>;
    concurrency: z.ZodOptional<z.ZodNumber>;
    space_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    connector_id: z.ZodString;
    agent_id: z.ZodOptional<z.ZodString>;
    task_ref: z.ZodOptional<z.ZodString>;
    params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const evaluateDatasetOutputSchema: z.ZodObject<{
    experiment_id: z.ZodString;
    example_count: z.ZodNumber;
    completed: z.ZodNumber;
    failed: z.ZodNumber;
    scores_ingested: z.ZodNumber;
    errors: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const evaluateDatasetCommonDefinition: CommonStepDefinition<typeof evaluateDatasetInputSchema, typeof evaluateDatasetOutputSchema>;
export declare const StartExperimentStepId: "ai.evals.startExperiment";
export declare const startExperimentInputSchema: z.ZodObject<{
    task_model: z.ZodObject<{
        id: z.ZodString;
        family: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    suite_id: z.ZodOptional<z.ZodString>;
    experiment_id: z.ZodOptional<z.ZodString>;
    execution_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const startExperimentOutputSchema: z.ZodObject<{
    experiment_id: z.ZodString;
    execution_id: z.ZodString;
}, z.core.$strip>;
export declare const startExperimentCommonDefinition: CommonStepDefinition<typeof startExperimentInputSchema, typeof startExperimentOutputSchema>;
export declare const CompareExperimentsStepId: "ai.evals.compareExperiments";
export declare const compareExperimentsInputSchema: z.ZodObject<{
    experiment_ids: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const compareExperimentsOutputSchema: z.ZodObject<{
    comparison: z.ZodUnknown;
}, z.core.$strip>;
export declare const compareExperimentsCommonDefinition: CommonStepDefinition<typeof compareExperimentsInputSchema, typeof compareExperimentsOutputSchema>;
export declare const EVALS_STEP_IDS: readonly ["ai.evals.resolveDataset", "ai.evals.executeTask", "ai.evals.evaluateTrace", "ai.evals.ingestScores", "ai.evals.evaluateExample", "ai.evals.evaluateDataset", "ai.evals.startExperiment", "ai.evals.compareExperiments"];
