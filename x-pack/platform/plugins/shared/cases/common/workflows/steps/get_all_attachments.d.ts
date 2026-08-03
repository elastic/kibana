import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
export declare const GetAllAttachmentsStepTypeId = "cases.getAllAttachments";
declare const InputSchema: z.ZodObject<{
    case_id: z.ZodString;
}, z.core.$strip>;
declare const OutputSchema: z.ZodObject<{
    attachments: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        alertId: z.ZodOptional<z.ZodArray<z.ZodString>>;
        created_at: z.ZodOptional<z.ZodString>;
        created_by: z.ZodOptional<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        id: z.ZodOptional<z.ZodString>;
        index: z.ZodOptional<z.ZodArray<z.ZodString>>;
        owner: z.ZodOptional<z.ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>>;
        pushed_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        rule: z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        type: z.ZodLiteral<"alert">;
        updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        updated_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        version: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        created_at: z.ZodOptional<z.ZodString>;
        created_by: z.ZodOptional<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        eventId: z.ZodOptional<z.ZodArray<z.ZodString>>;
        id: z.ZodOptional<z.ZodString>;
        index: z.ZodOptional<z.ZodArray<z.ZodString>>;
        owner: z.ZodOptional<z.ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>>;
        pushed_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        type: z.ZodLiteral<"event">;
        updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        updated_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        version: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        comment: z.ZodOptional<z.ZodString>;
        created_at: z.ZodOptional<z.ZodString>;
        created_by: z.ZodOptional<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        id: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>>;
        pushed_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        type: z.ZodLiteral<"user">;
        updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        updated_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        version: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>], "type">>;
}, z.core.$strip>;
type GetAllAttachmentsStepInputSchema = typeof InputSchema;
type GetAllAttachmentsStepOutputSchema = typeof OutputSchema;
export type GetAllAttachmentsStepInput = z.infer<typeof InputSchema>;
export declare const getAllAttachmentsStepCommonDefinition: CommonStepDefinition<GetAllAttachmentsStepInputSchema, GetAllAttachmentsStepOutputSchema>;
export {};
