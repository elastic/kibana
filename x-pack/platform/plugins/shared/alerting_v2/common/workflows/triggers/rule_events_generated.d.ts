import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
/**
 * Fires when a rule execution succeeds AND persists at least one rule event.
 *
 * Named for what it delivers (rule events to process) rather than for the
 * underlying `rule.execution.succeeded` domain event: successful runs that
 * produced zero rule events are intentionally not surfaced here (there is
 * nothing for a consumer to fetch from `.rule-events`).
 */
export declare const RuleEventsGeneratedTriggerId: "alerting.ruleEventsGenerated";
/**
 * Rule identity carried on the trigger. `id`/`spaceId` to
 * locate the rule, plus the two fields workflow authors need to route by
 * origin: `kind` (whether the rule emits signals or alerts) and `tags` (e.g.
 * `["security", "o11y"]`).
 *
 * Field shapes reuse the canonical alerting-v2 schemas (`ID_MAX_LENGTH`,
 * `ruleKindSchema`, `tagsSchema`) so this trigger stays in lockstep with what
 * the rule schemas actually persist.
 */
export declare const ruleEventsGeneratedRuleSchema: z.ZodObject<{
    id: z.ZodString;
    spaceId: z.ZodString;
    kind: z.ZodEnum<{
        signal: "signal";
        alert: "alert";
    }>;
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const ruleEventsGeneratedEventSchema: z.ZodObject<{
    rule: z.ZodObject<{
        id: z.ZodString;
        spaceId: z.ZodString;
        kind: z.ZodEnum<{
            signal: "signal";
            alert: "alert";
        }>;
        tags: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
    execution: z.ZodObject<{
        executionId: z.ZodString;
        scheduledAt: z.ZodString;
    }, z.core.$strip>;
    ruleEventsGenerated: z.ZodNumber;
}, z.core.$strip>;
export type RuleEventsGeneratedTriggerPayload = z.infer<typeof ruleEventsGeneratedEventSchema>;
export declare const ruleEventsGeneratedTriggerCommonDefinition: CommonTriggerDefinition<typeof ruleEventsGeneratedEventSchema>;
