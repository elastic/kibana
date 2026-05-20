import type { KibanaRequest } from '@kbn/core/server';
import type { CasesClient } from '../../client';
export declare const deleteObservableStepDefinition: (getCasesClient: (request: KibanaRequest) => Promise<CasesClient>) => import("@kbn/workflows-extensions/server").ServerStepDefinition<import("zod").ZodObject<{
    case_id: import("zod").ZodString;
    observable_id: import("zod").ZodString;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    case_id: import("zod").ZodString;
    observable_id: import("zod").ZodString;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<import("zod/v4/core").$ZodLooseShape, import("zod/v4/core").$strip>>;
