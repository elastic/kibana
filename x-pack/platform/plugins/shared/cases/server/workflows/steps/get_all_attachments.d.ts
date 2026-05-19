import type { KibanaRequest } from '@kbn/core/server';
import type { CasesClient } from '../../client';
export declare const getAllAttachmentsStepDefinition: (getCasesClient: (request: KibanaRequest) => Promise<CasesClient>) => import("@kbn/workflows-extensions/server").ServerStepDefinition<import("zod").ZodObject<{
    case_id: import("zod").ZodString;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    attachments: import("zod").ZodArray<import("zod").ZodDiscriminatedUnion<[import("zod").ZodObject<{
        alertId: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        created_at: import("zod").ZodOptional<import("zod").ZodString>;
        created_by: import("zod").ZodOptional<import("zod").ZodObject<{
            email: import("zod").ZodNullable<import("zod").ZodString>;
            full_name: import("zod").ZodNullable<import("zod").ZodString>;
            username: import("zod").ZodNullable<import("zod").ZodString>;
            profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
        id: import("zod").ZodOptional<import("zod").ZodString>;
        index: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        owner: import("zod").ZodOptional<import("zod").ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>>;
        pushed_at: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
        pushed_by: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
            email: import("zod").ZodNullable<import("zod").ZodString>;
            full_name: import("zod").ZodNullable<import("zod").ZodString>;
            username: import("zod").ZodNullable<import("zod").ZodString>;
            profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>>;
        rule: import("zod").ZodOptional<import("zod").ZodObject<{
            id: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            name: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
        }, import("zod/v4/core").$strip>>;
        type: import("zod").ZodLiteral<"alert">;
        updated_at: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
        updated_by: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
            email: import("zod").ZodNullable<import("zod").ZodString>;
            full_name: import("zod").ZodNullable<import("zod").ZodString>;
            username: import("zod").ZodNullable<import("zod").ZodString>;
            profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>>;
        version: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        created_at: import("zod").ZodOptional<import("zod").ZodString>;
        created_by: import("zod").ZodOptional<import("zod").ZodObject<{
            email: import("zod").ZodNullable<import("zod").ZodString>;
            full_name: import("zod").ZodNullable<import("zod").ZodString>;
            username: import("zod").ZodNullable<import("zod").ZodString>;
            profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
        eventId: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        id: import("zod").ZodOptional<import("zod").ZodString>;
        index: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        owner: import("zod").ZodOptional<import("zod").ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>>;
        pushed_at: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
        pushed_by: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
            email: import("zod").ZodNullable<import("zod").ZodString>;
            full_name: import("zod").ZodNullable<import("zod").ZodString>;
            username: import("zod").ZodNullable<import("zod").ZodString>;
            profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>>;
        type: import("zod").ZodLiteral<"event">;
        updated_at: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
        updated_by: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
            email: import("zod").ZodNullable<import("zod").ZodString>;
            full_name: import("zod").ZodNullable<import("zod").ZodString>;
            username: import("zod").ZodNullable<import("zod").ZodString>;
            profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>>;
        version: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        comment: import("zod").ZodOptional<import("zod").ZodString>;
        created_at: import("zod").ZodOptional<import("zod").ZodString>;
        created_by: import("zod").ZodOptional<import("zod").ZodObject<{
            email: import("zod").ZodNullable<import("zod").ZodString>;
            full_name: import("zod").ZodNullable<import("zod").ZodString>;
            username: import("zod").ZodNullable<import("zod").ZodString>;
            profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>;
        id: import("zod").ZodOptional<import("zod").ZodString>;
        owner: import("zod").ZodOptional<import("zod").ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>>;
        pushed_at: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
        pushed_by: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
            email: import("zod").ZodNullable<import("zod").ZodString>;
            full_name: import("zod").ZodNullable<import("zod").ZodString>;
            username: import("zod").ZodNullable<import("zod").ZodString>;
            profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>>;
        type: import("zod").ZodLiteral<"user">;
        updated_at: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
        updated_by: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
            email: import("zod").ZodNullable<import("zod").ZodString>;
            full_name: import("zod").ZodNullable<import("zod").ZodString>;
            username: import("zod").ZodNullable<import("zod").ZodString>;
            profile_uid: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod/v4/core").$strip>>>;
        version: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>], "type">>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<import("zod/v4/core").$ZodLooseShape, import("zod/v4/core").$strip>>;
