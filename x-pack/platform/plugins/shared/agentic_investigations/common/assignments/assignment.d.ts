import { z } from '@kbn/zod/v4';
export declare const assignConversationRequestParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
/**
 * Replace-in-full assignee list. The caller sends the complete desired set;
 * omitting a uid removes it.
 */
export declare const assignConversationRequestBodySchema: z.ZodObject<{
    assignees: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type AssignConversationRequest = z.infer<typeof assignConversationRequestBodySchema>;
