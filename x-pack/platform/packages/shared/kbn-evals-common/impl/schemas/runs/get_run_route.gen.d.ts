import { z } from '@kbn/zod/v4';
export declare const GetEvaluationRunRequestQuery: z.ZodObject<{
    suite_id: z.ZodOptional<z.ZodString>;
    model_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type GetEvaluationRunRequestQuery = z.infer<typeof GetEvaluationRunRequestQuery>;
export type GetEvaluationRunRequestQueryInput = z.input<typeof GetEvaluationRunRequestQuery>;
export declare const GetEvaluationRunRequestParams: z.ZodObject<{
    runId: z.ZodString;
}, z.core.$strip>;
export type GetEvaluationRunRequestParams = z.infer<typeof GetEvaluationRunRequestParams>;
export type GetEvaluationRunRequestParamsInput = z.input<typeof GetEvaluationRunRequestParams>;
export declare const GetEvaluationRunResponse: z.ZodObject<{
    run_id: z.ZodString;
    timestamp: z.ZodOptional<z.ZodString>;
    task_model: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        family: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    evaluator_model: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        family: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    git_branch: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    git_commit_sha: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ci: z.ZodOptional<z.ZodObject<{
        build_id: z.ZodOptional<z.ZodString>;
        job_id: z.ZodOptional<z.ZodString>;
        build_url: z.ZodOptional<z.ZodString>;
        pipeline_slug: z.ZodOptional<z.ZodString>;
        pull_request: z.ZodOptional<z.ZodString>;
        branch: z.ZodOptional<z.ZodString>;
        commit: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    total_repetitions: z.ZodOptional<z.ZodNumber>;
    stats: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strip>>;
}, z.core.$strip>;
export type GetEvaluationRunResponse = z.infer<typeof GetEvaluationRunResponse>;
