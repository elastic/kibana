import { z } from '@kbn/zod/v4';
export declare const EvaluationExperimentSummary: z.ZodObject<{
    execution_id: z.ZodOptional<z.ZodString>;
    experiment_id: z.ZodString;
    experiment_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    experiment_count: z.ZodOptional<z.ZodNumber>;
    timestamp: z.ZodString;
    suite_id: z.ZodOptional<z.ZodString>;
    dataset_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    dataset_names: z.ZodOptional<z.ZodArray<z.ZodString>>;
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
export type EvaluationExperimentSummary = z.infer<typeof EvaluationExperimentSummary>;
export declare const GetEvaluationExperimentsRequestQuery: z.ZodObject<{
    suite_id: z.ZodOptional<z.ZodString>;
    model_id: z.ZodOptional<z.ZodString>;
    branch: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    dataset_id: z.ZodOptional<z.ZodString>;
    build_id: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    per_page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export type GetEvaluationExperimentsRequestQuery = z.infer<typeof GetEvaluationExperimentsRequestQuery>;
export type GetEvaluationExperimentsRequestQueryInput = z.input<typeof GetEvaluationExperimentsRequestQuery>;
export declare const GetEvaluationExperimentsResponse: z.ZodObject<{
    experiments: z.ZodArray<z.ZodObject<{
        execution_id: z.ZodOptional<z.ZodString>;
        experiment_id: z.ZodString;
        experiment_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        experiment_count: z.ZodOptional<z.ZodNumber>;
        timestamp: z.ZodString;
        suite_id: z.ZodOptional<z.ZodString>;
        dataset_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
        dataset_names: z.ZodOptional<z.ZodArray<z.ZodString>>;
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
export type GetEvaluationExperimentsResponse = z.infer<typeof GetEvaluationExperimentsResponse>;
