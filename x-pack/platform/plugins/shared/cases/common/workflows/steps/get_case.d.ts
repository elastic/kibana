import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
export declare const GetCaseStepTypeId = "cases.getCase";
declare const InputSchema: z.ZodObject<{
    case_id: z.ZodString;
    include_comments: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
declare const OutputSchema: z.ZodObject<{
    case: z.ZodObject<{
        assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            uid: z.ZodString;
        }, z.core.$strip>>>>;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        closed_at: z.ZodNullable<z.ZodString>;
        closed_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        comments: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        connector: z.ZodDiscriminatedUnion<[z.ZodObject<{
            fields: z.ZodNullable<z.ZodString>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".none">;
        }, z.core.$strip>, z.ZodObject<{
            fields: z.ZodNullable<z.ZodString>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".cases-webhook">;
        }, z.core.$strip>, z.ZodObject<{
            fields: z.ZodObject<{
                issueType: z.ZodNullable<z.ZodString>;
                parent: z.ZodNullable<z.ZodString>;
                priority: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".jira">;
        }, z.core.$strip>, z.ZodObject<{
            fields: z.ZodNullable<z.ZodObject<{
                issueTypes: z.ZodArray<z.ZodString>;
                severityCode: z.ZodString;
            }, z.core.$strip>>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".resilient">;
        }, z.core.$strip>, z.ZodObject<{
            fields: z.ZodObject<{
                category: z.ZodNullable<z.ZodString>;
                impact: z.ZodNullable<z.ZodString>;
                severity: z.ZodNullable<z.ZodString>;
                subcategory: z.ZodNullable<z.ZodString>;
                urgency: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".servicenow">;
        }, z.core.$strip>, z.ZodObject<{
            fields: z.ZodObject<{
                category: z.ZodNullable<z.ZodString>;
                destIp: z.ZodNullable<z.ZodBoolean>;
                malwareHash: z.ZodNullable<z.ZodBoolean>;
                malwareUrl: z.ZodNullable<z.ZodBoolean>;
                priority: z.ZodNullable<z.ZodString>;
                sourceIp: z.ZodNullable<z.ZodBoolean>;
                subcategory: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".servicenow-sir">;
        }, z.core.$strip>, z.ZodObject<{
            fields: z.ZodObject<{
                caseId: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>;
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<".swimlane">;
        }, z.core.$strip>], "type">;
        created_at: z.ZodString;
        created_by: z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        customFields: z.ZodOptional<z.ZodArray<z.ZodObject<{
            key: z.ZodOptional<z.ZodString>;
            type: z.ZodOptional<z.ZodEnum<{
                text: "text";
                toggle: "toggle";
            }>>;
            value: z.ZodOptional<z.ZodUnion<readonly [z.ZodNullable<z.ZodString>, z.ZodBoolean]>>;
        }, z.core.$strip>>>;
        description: z.ZodString;
        duration: z.ZodNullable<z.ZodNumber>;
        external_service: z.ZodNullable<z.ZodObject<{
            connector_id: z.ZodOptional<z.ZodString>;
            connector_name: z.ZodOptional<z.ZodString>;
            external_id: z.ZodOptional<z.ZodString>;
            external_title: z.ZodOptional<z.ZodString>;
            external_url: z.ZodOptional<z.ZodString>;
            pushed_at: z.ZodOptional<z.ZodString>;
            pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                profile_uid: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
        }, z.core.$strip>>;
        id: z.ZodString;
        incremental_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        observables: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            typeKey: z.ZodString;
            value: z.ZodString;
            description: z.ZodNullable<z.ZodString>;
            createdAt: z.ZodString;
            updatedAt: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        owner: z.ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>;
        settings: z.ZodObject<{
            syncAlerts: z.ZodBoolean;
            extractObservables: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>;
        severity: z.ZodEnum<{
            critical: "critical";
            medium: "medium";
            high: "high";
            low: "low";
        }>;
        status: z.ZodEnum<{
            closed: "closed";
            open: "open";
            "in-progress": "in-progress";
        }>;
        tags: z.ZodArray<z.ZodString>;
        title: z.ZodString;
        totalAlerts: z.ZodNumber;
        totalComment: z.ZodNumber;
        total_observables: z.ZodNullable<z.ZodNumber>;
        totalEvents: z.ZodOptional<z.ZodNumber>;
        updated_at: z.ZodNullable<z.ZodString>;
        updated_by: z.ZodNullable<z.ZodObject<{
            email: z.ZodNullable<z.ZodString>;
            full_name: z.ZodNullable<z.ZodString>;
            username: z.ZodNullable<z.ZodString>;
            profile_uid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        version: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
type GetCaseStepInputSchema = typeof InputSchema;
type GetCaseStepOutputSchema = typeof OutputSchema;
export type GetCaseStepInput = z.infer<typeof InputSchema>;
export declare const getCaseStepCommonDefinition: CommonStepDefinition<GetCaseStepInputSchema, GetCaseStepOutputSchema>;
export {};
