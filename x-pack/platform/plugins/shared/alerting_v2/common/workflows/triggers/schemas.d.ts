import { z } from '@kbn/zod/v4';
export declare const ruleSnapshotSchema: z.ZodObject<{
    ruleId: z.ZodString;
    spaceId: z.ZodString;
}, z.core.$strip>;
export type RuleSnapshot = z.infer<typeof ruleSnapshotSchema>;
export declare const ruleLifecycleEventSchema: z.ZodObject<{
    rule: z.ZodObject<{
        ruleId: z.ZodString;
        spaceId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type RuleLifecycleEvent = z.infer<typeof ruleLifecycleEventSchema>;
