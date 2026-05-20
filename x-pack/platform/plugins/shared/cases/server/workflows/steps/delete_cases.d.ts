import type { KibanaRequest } from '@kbn/core/server';
import type { CasesClient } from '../../client';
export declare const deleteCasesStepDefinition: (getCasesClient: (request: KibanaRequest) => Promise<CasesClient>) => import("@kbn/workflows-extensions/server").ServerStepDefinition<import("zod").ZodObject<{
    case_ids: import("zod").ZodArray<import("zod").ZodString>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    case_ids: import("zod").ZodArray<import("zod").ZodString>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<import("zod/v4/core").$ZodLooseShape, import("zod/v4/core").$strip>>;
