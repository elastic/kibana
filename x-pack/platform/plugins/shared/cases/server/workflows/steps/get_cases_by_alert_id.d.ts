import type { KibanaRequest } from '@kbn/core/server';
import type { CasesClient } from '../../client';
export declare const getCasesByAlertIdStepDefinition: (getCasesClient: (request: KibanaRequest) => Promise<CasesClient>) => import("@kbn/workflows-extensions/server").ServerStepDefinition<import("zod").ZodObject<{
    alert_id: import("zod").ZodString;
    owner: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>, import("zod").ZodArray<import("zod").ZodEnum<{
        cases: "cases";
        observability: "observability";
        securitySolution: "securitySolution";
    }>>]>>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    cases: import("zod").ZodArray<import("zod").ZodObject<{
        id: import("zod").ZodString;
        title: import("zod").ZodString;
        description: import("zod").ZodString;
        status: import("zod").ZodEnum<{
            closed: "closed";
            open: "open";
            "in-progress": "in-progress";
        }>;
        createdAt: import("zod").ZodString;
        totals: import("zod").ZodObject<{
            alerts: import("zod").ZodNumber;
            events: import("zod").ZodNumber;
            userComments: import("zod").ZodNumber;
        }, import("zod/v4/core").$strip>;
    }, import("zod/v4/core").$strip>>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<import("zod/v4/core").$ZodLooseShape, import("zod/v4/core").$strip>>;
