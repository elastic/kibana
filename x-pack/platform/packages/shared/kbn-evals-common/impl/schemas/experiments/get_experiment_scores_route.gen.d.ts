import { z } from '@kbn/zod/v4';
export declare const GetEvaluationExperimentScoresRequestQuery: z.ZodObject<{
    suite_id: z.ZodOptional<z.ZodString>;
    model_id: z.ZodOptional<z.ZodString>;
    execution_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type GetEvaluationExperimentScoresRequestQuery = z.infer<typeof GetEvaluationExperimentScoresRequestQuery>;
export type GetEvaluationExperimentScoresRequestQueryInput = z.input<typeof GetEvaluationExperimentScoresRequestQuery>;
export declare const GetEvaluationExperimentScoresRequestParams: z.ZodObject<{
    experimentId: z.ZodString;
}, z.core.$strip>;
export type GetEvaluationExperimentScoresRequestParams = z.infer<typeof GetEvaluationExperimentScoresRequestParams>;
export type GetEvaluationExperimentScoresRequestParamsInput = z.input<typeof GetEvaluationExperimentScoresRequestParams>;
export declare const GetEvaluationExperimentScoresResponse: z.ZodObject<{
    scores: z.ZodArray<z.ZodObject<{
        '@timestamp': z.ZodString;
        experiment_id: z.ZodString;
        experiment_name: z.ZodOptional<z.ZodString>;
        space_ids: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
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
        metadata: z.ZodObject<{
            execution_id: z.ZodOptional<z.ZodString>;
            suite_id: z.ZodOptional<z.ZodString>;
            total_repetitions: z.ZodNumber;
            hostname: z.ZodOptional<z.ZodString>;
            git: z.ZodOptional<z.ZodObject<{
                branch: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                commit_sha: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$strip>>;
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
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export type GetEvaluationExperimentScoresResponse = z.infer<typeof GetEvaluationExperimentScoresResponse>;
