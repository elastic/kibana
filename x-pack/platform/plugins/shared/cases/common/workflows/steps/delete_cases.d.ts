import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
export declare const DeleteCasesStepTypeId = "cases.deleteCases";
declare const InputSchema: z.ZodObject<{
    case_ids: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
declare const OutputSchema: z.ZodObject<{
    case_ids: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
type DeleteCasesStepInputSchema = typeof InputSchema;
type DeleteCasesStepOutputSchema = typeof OutputSchema;
export declare const deleteCasesStepCommonDefinition: CommonStepDefinition<DeleteCasesStepInputSchema, DeleteCasesStepOutputSchema>;
export {};
