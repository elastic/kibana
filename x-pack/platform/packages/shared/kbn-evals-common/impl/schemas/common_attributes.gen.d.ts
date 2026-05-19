import { z } from '@kbn/zod/v4';
export declare const Model: z.ZodObject<{
    id: z.ZodString;
    family: z.ZodOptional<z.ZodString>;
    provider: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type Model = z.infer<typeof Model>;
export declare const BuildkiteMetadata: z.ZodObject<{
    build_id: z.ZodOptional<z.ZodString>;
    job_id: z.ZodOptional<z.ZodString>;
    build_url: z.ZodOptional<z.ZodString>;
    pipeline_slug: z.ZodOptional<z.ZodString>;
    pull_request: z.ZodOptional<z.ZodString>;
    branch: z.ZodOptional<z.ZodString>;
    commit: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type BuildkiteMetadata = z.infer<typeof BuildkiteMetadata>;
export declare const ExampleInfo: z.ZodObject<{
    id: z.ZodString;
    index: z.ZodNumber;
    input: z.ZodOptional<z.ZodNullable<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>>;
    dataset: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ExampleInfo = z.infer<typeof ExampleInfo>;
export declare const TaskInfo: z.ZodObject<{
    trace_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    repetition_index: z.ZodNumber;
    output: z.ZodOptional<z.ZodNullable<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>>;
    model: z.ZodObject<{
        id: z.ZodString;
        family: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type TaskInfo = z.infer<typeof TaskInfo>;
export declare const EvaluatorInfo: z.ZodObject<{
    name: z.ZodString;
    score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    explanation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>>;
    trace_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    model: z.ZodObject<{
        id: z.ZodString;
        family: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type EvaluatorInfo = z.infer<typeof EvaluatorInfo>;
export declare const RunMetadata: z.ZodObject<{
    git_branch: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    git_commit_sha: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    total_repetitions: z.ZodNumber;
}, z.core.$strip>;
export type RunMetadata = z.infer<typeof RunMetadata>;
export declare const EvaluationScoreDocument: z.ZodObject<{
    '@timestamp': z.ZodString;
    run_id: z.ZodString;
    experiment_id: z.ZodString;
    suite: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    ci: z.ZodOptional<z.ZodObject<{
        buildkite: z.ZodOptional<z.ZodObject<{
            build_id: z.ZodOptional<z.ZodString>;
            job_id: z.ZodOptional<z.ZodString>;
            build_url: z.ZodOptional<z.ZodString>;
            pipeline_slug: z.ZodOptional<z.ZodString>;
            pull_request: z.ZodOptional<z.ZodString>;
            branch: z.ZodOptional<z.ZodString>;
            commit: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    example: z.ZodObject<{
        id: z.ZodString;
        index: z.ZodNumber;
        input: z.ZodOptional<z.ZodNullable<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>>;
        dataset: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>;
    task: z.ZodObject<{
        trace_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        repetition_index: z.ZodNumber;
        output: z.ZodOptional<z.ZodNullable<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>>;
        model: z.ZodObject<{
            id: z.ZodString;
            family: z.ZodOptional<z.ZodString>;
            provider: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    evaluator: z.ZodObject<{
        name: z.ZodString;
        score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        explanation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        metadata: z.ZodOptional<z.ZodNullable<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>>;
        trace_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        model: z.ZodObject<{
            id: z.ZodString;
            family: z.ZodOptional<z.ZodString>;
            provider: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    run_metadata: z.ZodObject<{
        git_branch: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        git_commit_sha: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        total_repetitions: z.ZodNumber;
    }, z.core.$strip>;
    environment: z.ZodObject<{
        hostname: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type EvaluationScoreDocument = z.infer<typeof EvaluationScoreDocument>;
export declare const EvaluatorStats: z.ZodObject<{
    dataset_id: z.ZodString;
    dataset_name: z.ZodString;
    evaluator_name: z.ZodString;
    stats: z.ZodObject<{
        mean: z.ZodNumber;
        median: z.ZodNumber;
        std_dev: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
        count: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type EvaluatorStats = z.infer<typeof EvaluatorStats>;
export declare const TraceSpan: z.ZodObject<{
    span_id: z.ZodString;
    trace_id: z.ZodString;
    parent_span_id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    kind: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    start_time: z.ZodString;
    end_time: z.ZodOptional<z.ZodString>;
    duration_ms: z.ZodNumber;
    attributes: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
}, z.core.$strip>;
export type TraceSpan = z.infer<typeof TraceSpan>;
