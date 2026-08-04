import { z } from '@kbn/zod/v4';
export declare const IngestScoresRequestBody: z.ZodObject<{
    experiment_id: z.ZodString;
    experiment_name: z.ZodOptional<z.ZodString>;
    space_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    task_model: z.ZodObject<{
        id: z.ZodString;
        family: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    evaluator_model: z.ZodObject<{
        id: z.ZodString;
        family: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    metadata: z.ZodObject<{
        execution_id: z.ZodOptional<z.ZodString>;
        suite_id: z.ZodOptional<z.ZodString>;
        total_repetitions: z.ZodNumber;
        hostname: z.ZodString;
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
    scores: z.ZodArray<z.ZodObject<{
        example: z.ZodObject<{
            id: z.ZodString;
            index: z.ZodNumber;
            input: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
            dataset: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>;
        task: z.ZodObject<{
            trace_id: z.ZodOptional<z.ZodString>;
            repetition_index: z.ZodNumber;
            output: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        }, z.core.$strip>;
        evaluator: z.ZodObject<{
            name: z.ZodString;
            score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            explanation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            metadata: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
            trace_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type IngestScoresRequestBody = z.infer<typeof IngestScoresRequestBody>;
export type IngestScoresRequestBodyInput = z.input<typeof IngestScoresRequestBody>;
export declare const IngestScoresResponse: z.ZodObject<{
    ingested: z.ZodNumber;
    conflicted: z.ZodNumber;
    failed: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        status: z.ZodNumber;
        reason: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type IngestScoresResponse = z.infer<typeof IngestScoresResponse>;
