import { z } from '@kbn/zod/v4';
export declare const GetEvaluationExperimentRequestQuery: z.ZodObject<{
    suite_id: z.ZodOptional<z.ZodString>;
    model_id: z.ZodOptional<z.ZodString>;
    execution_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type GetEvaluationExperimentRequestQuery = z.infer<typeof GetEvaluationExperimentRequestQuery>;
export type GetEvaluationExperimentRequestQueryInput = z.input<typeof GetEvaluationExperimentRequestQuery>;
export declare const GetEvaluationExperimentRequestParams: z.ZodObject<{
    experimentId: z.ZodString;
}, z.core.$strip>;
export type GetEvaluationExperimentRequestParams = z.infer<typeof GetEvaluationExperimentRequestParams>;
export type GetEvaluationExperimentRequestParamsInput = z.input<typeof GetEvaluationExperimentRequestParams>;
export declare const GetEvaluationExperimentResponse: z.ZodObject<{
    experiment_id: z.ZodString;
    experiment_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
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
    execution_id: z.ZodOptional<z.ZodString>;
    suite_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    total_repetitions: z.ZodOptional<z.ZodNumber>;
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
    stats: z.ZodArray<z.ZodObject<{
        dataset_id: z.ZodString;
        dataset_name: z.ZodString;
        evaluator_name: z.ZodString;
        example_count: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
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
export type GetEvaluationExperimentResponse = z.infer<typeof GetEvaluationExperimentResponse>;
