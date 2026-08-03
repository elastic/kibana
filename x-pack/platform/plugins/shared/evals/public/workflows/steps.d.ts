/**
 * Editor-facing step definitions, reusing the shared common definitions so the
 * YAML editor stays in lockstep with the server handlers. Exported individually
 * so the plugin can lazy-load them, keeping them out of the setup bundle.
 */
export declare const resolveDatasetPublicStep: import("@kbn/workflows-extensions/public").PublicStepDefinition<import("zod").ZodObject<{
    dataset_ids: import("zod").ZodArray<import("zod").ZodString>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    datasets: import("zod").ZodArray<import("zod").ZodObject<{
        id: import("zod").ZodString;
        name: import("zod").ZodString;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        examples: import("zod").ZodArray<import("zod").ZodObject<{
            id: import("zod").ZodString;
            index: import("zod").ZodOptional<import("zod").ZodNumber>;
            input: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
            output: import("zod").ZodOptional<import("zod").ZodUnknown>;
            metadata: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<import("zod/v4/core").$ZodLooseShape, import("zod/v4/core").$strip>>;
export declare const executeTaskPublicStep: import("@kbn/workflows-extensions/public").PublicStepDefinition<import("zod").ZodObject<{
    example: import("zod").ZodObject<{
        id: import("zod").ZodString;
        index: import("zod").ZodOptional<import("zod").ZodNumber>;
        input: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
        output: import("zod").ZodOptional<import("zod").ZodUnknown>;
        metadata: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>;
    }, import("zod/v4/core").$strip>;
    connector_id: import("zod").ZodString;
    agent_id: import("zod").ZodOptional<import("zod").ZodString>;
    task_ref: import("zod").ZodOptional<import("zod").ZodString>;
    params: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    output: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>;
    trace_id: import("zod").ZodOptional<import("zod").ZodString>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<import("zod/v4/core").$ZodLooseShape, import("zod/v4/core").$strip>>;
export declare const evaluateTracePublicStep: import("@kbn/workflows-extensions/public").PublicStepDefinition<import("zod").ZodObject<{
    trace_id: import("zod").ZodString;
    reference_data: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
    evaluators: import("zod").ZodArray<import("zod").ZodObject<{
        name: import("zod").ZodString;
        version: import("zod").ZodOptional<import("zod").ZodString>;
        connector_id: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    results: import("zod").ZodArray<import("zod").ZodObject<{
        evaluator: import("zod").ZodObject<{
            name: import("zod").ZodString;
            version: import("zod").ZodOptional<import("zod").ZodString>;
            kind: import("zod").ZodOptional<import("zod").ZodEnum<{
                code: "code";
                llm: "llm";
            }>>;
        }, import("zod/v4/core").$strip>;
        scores: import("zod").ZodArray<import("zod").ZodObject<{
            name: import("zod").ZodString;
            score: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodNumber>>;
            label: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            explanation: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            metadata: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
            trace_id: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>>;
    errors: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<import("zod/v4/core").$ZodLooseShape, import("zod/v4/core").$strip>>;
export declare const ingestScoresPublicStep: import("@kbn/workflows-extensions/public").PublicStepDefinition<import("zod").ZodObject<{
    experiment_id: import("zod").ZodString;
    experiment_name: import("zod").ZodOptional<import("zod").ZodString>;
    execution_id: import("zod").ZodOptional<import("zod").ZodString>;
    suite_id: import("zod").ZodOptional<import("zod").ZodString>;
    task_model: import("zod").ZodObject<{
        id: import("zod").ZodString;
        family: import("zod").ZodOptional<import("zod").ZodString>;
        provider: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>;
    evaluator_model: import("zod").ZodOptional<import("zod").ZodObject<{
        id: import("zod").ZodString;
        family: import("zod").ZodOptional<import("zod").ZodString>;
        provider: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>>;
    total_repetitions: import("zod").ZodOptional<import("zod").ZodNumber>;
    example: import("zod").ZodObject<{
        id: import("zod").ZodString;
        index: import("zod").ZodNumber;
        input: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
        dataset: import("zod").ZodObject<{
            id: import("zod").ZodString;
            name: import("zod").ZodString;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>;
    task: import("zod").ZodObject<{
        trace_id: import("zod").ZodOptional<import("zod").ZodString>;
        repetition_index: import("zod").ZodNumber;
        output: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
    }, import("zod/v4/core").$strip>;
    evaluator_results: import("zod").ZodArray<import("zod").ZodObject<{
        evaluator: import("zod").ZodObject<{
            name: import("zod").ZodString;
            version: import("zod").ZodOptional<import("zod").ZodString>;
            kind: import("zod").ZodOptional<import("zod").ZodEnum<{
                code: "code";
                llm: "llm";
            }>>;
        }, import("zod/v4/core").$strip>;
        scores: import("zod").ZodArray<import("zod").ZodObject<{
            name: import("zod").ZodString;
            score: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodNumber>>;
            label: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            explanation: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            metadata: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
            trace_id: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
        }, import("zod/v4/core").$strip>>;
    }, import("zod/v4/core").$strip>>;
    space_ids: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    ingested: import("zod").ZodNumber;
    conflicted: import("zod").ZodNumber;
    failed: import("zod").ZodNumber;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<import("zod/v4/core").$ZodLooseShape, import("zod/v4/core").$strip>>;
export declare const evaluateExamplePublicStep: import("@kbn/workflows-extensions/public").PublicStepDefinition<import("zod").ZodObject<{
    experiment_id: import("zod").ZodString;
    experiment_name: import("zod").ZodOptional<import("zod").ZodString>;
    execution_id: import("zod").ZodOptional<import("zod").ZodString>;
    suite_id: import("zod").ZodOptional<import("zod").ZodString>;
    task_model: import("zod").ZodOptional<import("zod").ZodObject<{
        id: import("zod").ZodString;
        family: import("zod").ZodOptional<import("zod").ZodString>;
        provider: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>>;
    dataset: import("zod").ZodObject<{
        id: import("zod").ZodString;
        name: import("zod").ZodString;
    }, import("zod/v4/core").$strip>;
    example: import("zod").ZodObject<{
        id: import("zod").ZodString;
        index: import("zod").ZodOptional<import("zod").ZodNumber>;
        input: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
        output: import("zod").ZodOptional<import("zod").ZodUnknown>;
        metadata: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>;
    }, import("zod/v4/core").$strip>;
    evaluators: import("zod").ZodArray<import("zod").ZodObject<{
        name: import("zod").ZodString;
        version: import("zod").ZodOptional<import("zod").ZodString>;
        connector_id: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>>;
    reference_data: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
    repetitions: import("zod").ZodOptional<import("zod").ZodNumber>;
    space_ids: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    connector_id: import("zod").ZodString;
    agent_id: import("zod").ZodOptional<import("zod").ZodString>;
    task_ref: import("zod").ZodOptional<import("zod").ZodString>;
    params: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    scores_ingested: import("zod").ZodNumber;
    failed: import("zod").ZodNumber;
    repetitions: import("zod").ZodNumber;
    errors: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<import("zod/v4/core").$ZodLooseShape, import("zod/v4/core").$strip>>;
export declare const evaluateDatasetPublicStep: import("@kbn/workflows-extensions/public").PublicStepDefinition<import("zod").ZodObject<{
    experiment_id: import("zod").ZodString;
    experiment_name: import("zod").ZodOptional<import("zod").ZodString>;
    execution_id: import("zod").ZodOptional<import("zod").ZodString>;
    suite_id: import("zod").ZodOptional<import("zod").ZodString>;
    task_model: import("zod").ZodOptional<import("zod").ZodObject<{
        id: import("zod").ZodString;
        family: import("zod").ZodOptional<import("zod").ZodString>;
        provider: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>>;
    dataset_ids: import("zod").ZodArray<import("zod").ZodString>;
    evaluators: import("zod").ZodArray<import("zod").ZodObject<{
        name: import("zod").ZodString;
        version: import("zod").ZodOptional<import("zod").ZodString>;
        connector_id: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>>;
    repetitions: import("zod").ZodOptional<import("zod").ZodNumber>;
    concurrency: import("zod").ZodOptional<import("zod").ZodNumber>;
    space_ids: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    connector_id: import("zod").ZodString;
    agent_id: import("zod").ZodOptional<import("zod").ZodString>;
    task_ref: import("zod").ZodOptional<import("zod").ZodString>;
    params: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    experiment_id: import("zod").ZodString;
    example_count: import("zod").ZodNumber;
    completed: import("zod").ZodNumber;
    failed: import("zod").ZodNumber;
    scores_ingested: import("zod").ZodNumber;
    errors: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<import("zod/v4/core").$ZodLooseShape, import("zod/v4/core").$strip>>;
export declare const startExperimentPublicStep: import("@kbn/workflows-extensions/public").PublicStepDefinition<import("zod").ZodObject<{
    task_model: import("zod").ZodObject<{
        id: import("zod").ZodString;
        family: import("zod").ZodOptional<import("zod").ZodString>;
        provider: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>;
    suite_id: import("zod").ZodOptional<import("zod").ZodString>;
    experiment_id: import("zod").ZodOptional<import("zod").ZodString>;
    execution_id: import("zod").ZodOptional<import("zod").ZodString>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    experiment_id: import("zod").ZodString;
    execution_id: import("zod").ZodString;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<import("zod/v4/core").$ZodLooseShape, import("zod/v4/core").$strip>>;
export declare const compareExperimentsPublicStep: import("@kbn/workflows-extensions/public").PublicStepDefinition<import("zod").ZodObject<{
    experiment_ids: import("zod").ZodArray<import("zod").ZodString>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    comparison: import("zod").ZodUnknown;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<import("zod/v4/core").$ZodLooseShape, import("zod/v4/core").$strip>>;
