import { z } from '@kbn/zod/v4';
export declare const RespondToInboxActionRequestParams: z.ZodObject<{
    source_app: z.ZodString;
    source_id: z.ZodString;
}, z.core.$strip>;
export type RespondToInboxActionRequestParams = z.infer<typeof RespondToInboxActionRequestParams>;
export type RespondToInboxActionRequestParamsInput = z.input<typeof RespondToInboxActionRequestParams>;
export declare const RespondToInboxActionRequestBody: z.ZodObject<{
    input: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
}, z.core.$strip>;
export type RespondToInboxActionRequestBody = z.infer<typeof RespondToInboxActionRequestBody>;
export type RespondToInboxActionRequestBodyInput = z.input<typeof RespondToInboxActionRequestBody>;
export declare const RespondToInboxActionResponse: z.ZodObject<{
    ok: z.ZodBoolean;
}, z.core.$strip>;
export type RespondToInboxActionResponse = z.infer<typeof RespondToInboxActionResponse>;
