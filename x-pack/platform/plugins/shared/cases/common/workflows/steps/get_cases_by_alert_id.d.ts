import type { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
export declare const GetCasesByAlertIdStepTypeId = "cases.getCasesByAlertId";
declare const InputSchema: z.ZodObject<{
    alert_id: z.ZodString;
    owner: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
        observability: "observability";
        cases: "cases";
        securitySolution: "securitySolution";
    }>, z.ZodArray<z.ZodEnum<{
        observability: "observability";
        cases: "cases";
        securitySolution: "securitySolution";
    }>>]>>;
}, z.core.$strip>;
declare const OutputSchema: z.ZodObject<{
    cases: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        status: z.ZodEnum<{
            open: "open";
            closed: "closed";
            "in-progress": "in-progress";
        }>;
        createdAt: z.ZodString;
        totals: z.ZodObject<{
            alerts: z.ZodNumber;
            events: z.ZodNumber;
            userComments: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>;
type GetCasesByAlertIdStepInputSchema = typeof InputSchema;
type GetCasesByAlertIdStepOutputSchema = typeof OutputSchema;
export type GetCasesByAlertIdStepInput = z.infer<typeof InputSchema>;
export declare const getCasesByAlertIdStepCommonDefinition: CommonStepDefinition<GetCasesByAlertIdStepInputSchema, GetCasesByAlertIdStepOutputSchema>;
export {};
