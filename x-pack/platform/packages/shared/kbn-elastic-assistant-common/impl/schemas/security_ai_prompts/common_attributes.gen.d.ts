import { z } from '@kbn/zod/v4';
export type PromptItem = z.infer<typeof PromptItem>;
export declare const PromptItem: z.ZodObject<{
    promptId: z.ZodString;
    prompt: z.ZodString;
}, z.core.$strip>;
/**
 * Prompt array by prompt group id and prompt id.
 */
export type PromptItemArray = z.infer<typeof PromptItemArray>;
export declare const PromptItemArray: z.ZodArray<z.ZodObject<{
    promptId: z.ZodString;
    prompt: z.ZodString;
}, z.core.$strip>>;
