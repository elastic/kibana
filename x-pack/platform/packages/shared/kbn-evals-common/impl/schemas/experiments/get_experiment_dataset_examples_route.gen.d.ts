import { z } from '@kbn/zod/v4';
export declare const EvaluationExperimentDatasetExample: z.ZodObject<{
    example_id: z.ZodString;
    example_index: z.ZodNullable<z.ZodNumber>;
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
}, z.core.$strip>;
export type EvaluationExperimentDatasetExample = z.infer<typeof EvaluationExperimentDatasetExample>;
export declare const GetEvaluationExperimentDatasetExamplesRequestQuery: z.ZodObject<{
    execution_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type GetEvaluationExperimentDatasetExamplesRequestQuery = z.infer<typeof GetEvaluationExperimentDatasetExamplesRequestQuery>;
export type GetEvaluationExperimentDatasetExamplesRequestQueryInput = z.input<typeof GetEvaluationExperimentDatasetExamplesRequestQuery>;
export declare const GetEvaluationExperimentDatasetExamplesRequestParams: z.ZodObject<{
    experimentId: z.ZodString;
    datasetId: z.ZodString;
}, z.core.$strip>;
export type GetEvaluationExperimentDatasetExamplesRequestParams = z.infer<typeof GetEvaluationExperimentDatasetExamplesRequestParams>;
export type GetEvaluationExperimentDatasetExamplesRequestParamsInput = z.input<typeof GetEvaluationExperimentDatasetExamplesRequestParams>;
export declare const GetEvaluationExperimentDatasetExamplesResponse: z.ZodObject<{
    examples: z.ZodArray<z.ZodObject<{
        example_id: z.ZodString;
        example_index: z.ZodNullable<z.ZodNumber>;
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
    }, z.core.$strip>>;
}, z.core.$strip>;
export type GetEvaluationExperimentDatasetExamplesResponse = z.infer<typeof GetEvaluationExperimentDatasetExamplesResponse>;
