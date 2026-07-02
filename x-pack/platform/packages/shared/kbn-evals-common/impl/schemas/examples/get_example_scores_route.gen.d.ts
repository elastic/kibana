import { z } from '@kbn/zod/v4';
export declare const GetExampleScoresRequestParams: z.ZodObject<{
    exampleId: z.ZodString;
}, z.core.$strip>;
export type GetExampleScoresRequestParams = z.infer<typeof GetExampleScoresRequestParams>;
export type GetExampleScoresRequestParamsInput = z.input<typeof GetExampleScoresRequestParams>;
export declare const GetExampleScoresResponse: z.ZodObject<{
    scores: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strip>>;
    total: z.ZodNumber;
}, z.core.$strip>;
export type GetExampleScoresResponse = z.infer<typeof GetExampleScoresResponse>;
