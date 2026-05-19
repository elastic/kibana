import { z } from '@kbn/zod/v4';
export declare const EvaluationRunSummary: z.ZodObject<{
    run_id: z.ZodString;
    timestamp: z.ZodString;
    suite_id: z.ZodOptional<z.ZodString>;
    dataset_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dataset_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
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
    total_repetitions: z.ZodOptional<z.ZodNumber>;
    ci: z.ZodOptional<z.ZodObject<{
        build_id: z.ZodOptional<z.ZodString>;
        job_id: z.ZodOptional<z.ZodString>;
        build_url: z.ZodOptional<z.ZodString>;
        pipeline_slug: z.ZodOptional<z.ZodString>;
        pull_request: z.ZodOptional<z.ZodString>;
        branch: z.ZodOptional<z.ZodString>;
        commit: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type EvaluationRunSummary = z.infer<typeof EvaluationRunSummary>;
export declare const GetEvaluationRunsRequestQuery: z.ZodObject<{
    suite_id: z.ZodOptional<z.ZodString>;
    model_id: z.ZodOptional<z.ZodString>;
    branch: z.ZodOptional<z.ZodString>;
    dataset_id: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    per_page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export type GetEvaluationRunsRequestQuery = z.infer<typeof GetEvaluationRunsRequestQuery>;
export type GetEvaluationRunsRequestQueryInput = z.input<typeof GetEvaluationRunsRequestQuery>;
export declare const GetEvaluationRunsResponse: z.ZodObject<{
    runs: z.ZodArray<z.ZodObject<{
        run_id: z.ZodString;
        timestamp: z.ZodString;
        suite_id: z.ZodOptional<z.ZodString>;
        dataset_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        dataset_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
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
        total_repetitions: z.ZodOptional<z.ZodNumber>;
        ci: z.ZodOptional<z.ZodObject<{
            build_id: z.ZodOptional<z.ZodString>;
            job_id: z.ZodOptional<z.ZodString>;
            build_url: z.ZodOptional<z.ZodString>;
            pipeline_slug: z.ZodOptional<z.ZodString>;
            pull_request: z.ZodOptional<z.ZodString>;
            branch: z.ZodOptional<z.ZodString>;
            commit: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export type GetEvaluationRunsResponse = z.infer<typeof GetEvaluationRunsResponse>;
