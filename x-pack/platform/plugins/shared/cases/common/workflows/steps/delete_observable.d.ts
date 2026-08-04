import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
export declare const DeleteObservableStepTypeId = "cases.deleteObservable";
declare const InputSchema: z.ZodObject<{
    case_id: z.ZodString;
    observable_id: z.ZodString;
}, z.core.$strip>;
declare const OutputSchema: z.ZodObject<{
    case_id: z.ZodString;
    observable_id: z.ZodString;
}, z.core.$strip>;
type DeleteObservableStepInputSchema = typeof InputSchema;
type DeleteObservableStepOutputSchema = typeof OutputSchema;
export type DeleteObservableStepInput = z.infer<typeof InputSchema>;
export declare const deleteObservableStepCommonDefinition: CommonStepDefinition<DeleteObservableStepInputSchema, DeleteObservableStepOutputSchema>;
export {};
