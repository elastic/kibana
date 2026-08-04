import { z } from '@kbn/zod/v4';
export declare const CASE_ATTACHMENT_TYPE: "case";
export declare const CASES_ATTACHMENT_TYPE: "cases";
export declare const caseAttachmentDataSchema: z.ZodObject<{
    description: z.ZodString;
    id: z.ZodString;
    title: z.ZodString;
    status: z.ZodEnum<{
        closed: "closed";
        open: "open";
        "in-progress": "in-progress";
    }>;
    created_at: z.ZodString;
    updated_at: z.ZodNullable<z.ZodString>;
    tags: z.ZodArray<z.ZodString>;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    severity: z.ZodEnum<{
        medium: "medium";
        high: "high";
        low: "low";
        critical: "critical";
    }>;
    owner: z.ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>;
    assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
    }, z.core.$strip>>>>;
    totalAlerts: z.ZodNumber;
    total_observables: z.ZodNullable<z.ZodNumber>;
    incremental_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    totalComment: z.ZodNumber;
    url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    totalAttachments: z.ZodOptional<z.ZodNumber>;
    connector_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type CaseAttachmentData = z.infer<typeof caseAttachmentDataSchema>;
export declare const CASES_ATTACHMENT_MAX = 20;
export declare const casesAttachmentDataSchema: z.ZodObject<{
    cases: z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        id: z.ZodString;
        title: z.ZodString;
        status: z.ZodEnum<{
            closed: "closed";
            open: "open";
            "in-progress": "in-progress";
        }>;
        created_at: z.ZodString;
        updated_at: z.ZodNullable<z.ZodString>;
        tags: z.ZodArray<z.ZodString>;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        severity: z.ZodEnum<{
            medium: "medium";
            high: "high";
            low: "low";
            critical: "critical";
        }>;
        owner: z.ZodEnum<{
            cases: "cases";
            observability: "observability";
            securitySolution: "securitySolution";
        }>;
        assignees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            uid: z.ZodString;
        }, z.core.$strip>>>>;
        totalAlerts: z.ZodNumber;
        total_observables: z.ZodNullable<z.ZodNumber>;
        incremental_id: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        totalComment: z.ZodNumber;
        url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        totalAttachments: z.ZodOptional<z.ZodNumber>;
        connector_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    total: z.ZodNumber;
    url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type CasesAttachmentData = z.infer<typeof casesAttachmentDataSchema>;
