import { z } from '@kbn/zod/v4';
export declare const ACTION_POLICY_ROUTING_TAGS_SEARCH_MAX_LENGTH = 256;
export declare const ACTION_POLICY_ROUTING_TAGS_DEFAULT_POLICIES_PER_TAG = 5;
export declare const ACTION_POLICY_ROUTING_TAGS_MAX_POLICIES_PER_TAG = 20;
/** Query parameters for the action policy routing tags API. */
export declare const actionPolicyRoutingTagsParamsSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    policies_per_tag: z.ZodDefault<z.ZodPreprocess<z.ZodNumber>>;
}, z.core.$strict>;
export type ActionPolicyRoutingTagsParams = z.infer<typeof actionPolicyRoutingTagsParamsSchema>;
export declare const actionPolicyRoutingTagPolicySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export declare const actionPolicyRoutingTagItemSchema: z.ZodObject<{
    tag: z.ZodString;
    policy_count: z.ZodNumber;
    policies: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ActionPolicyRoutingTagItem = z.infer<typeof actionPolicyRoutingTagItemSchema>;
/** Action policy routing tags response schema. */
export declare const actionPolicyRoutingTagsResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        tag: z.ZodString;
        policy_count: z.ZodNumber;
        policies: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    total_tags: z.ZodNumber;
    is_truncated: z.ZodBoolean;
}, z.core.$strip>;
export type ActionPolicyRoutingTagsResponse = z.infer<typeof actionPolicyRoutingTagsResponseSchema>;
