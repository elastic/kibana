import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
export declare const RuleExecutionFailedTriggerId: "alerting.ruleExecutionFailed";
/**
 * Upper bound for the error message. Reuses `MAX_DESCRIPTION_LENGTH` — the
 * canonical bound for human-readable text in alerting-v2. The failed-trigger
 * binding truncates longer messages to this length so the emitted payload
 * always satisfies the schema (the workflow engine rejects oversized payloads).
 */
export declare const RULE_EXECUTION_FAILED_ERROR_MAX_LENGTH = 1024;
export declare const ruleExecutionFailedEventSchema: z.ZodObject<{
    rule: z.ZodObject<{
        id: z.ZodString;
        spaceId: z.ZodString;
    }, z.core.$strip>;
    error: z.ZodString;
}, z.core.$strip>;
export type RuleExecutionFailedTriggerPayload = z.infer<typeof ruleExecutionFailedEventSchema>;
export declare const ruleExecutionFailedTriggerCommonDefinition: CommonTriggerDefinition<typeof ruleExecutionFailedEventSchema>;
