import { z } from '@kbn/zod/v4';
/** Maximum number of tags that can be set on a policy matcher. */
export declare const POLICY_MATCHER_TAGS_MAX = 50;
/**
 * Matcher tags are compared against rule routing tags, so a longer one could never
 * match anything.
 */
export declare const POLICY_MATCHER_TAG_MAX_LENGTH = 128;
export declare const POLICY_MATCHER_TAGS_DESCRIPTION = "Routing tags this policy should match. The policy applies to alerts from any rule whose `metadata.routing_tags` include at least one of these tags. Omit `matcher.tags` or set it to `null` to match on `matcher.expression` alone.";
export declare const POLICY_MATCHER_EXPRESSION_DESCRIPTION = "A KQL query that's evaluated against each alert. Supported fields are: `alert_id`, `alert_status`, `group_hash`, `last_event_timestamp`, `severity`, and your rule's query output columns under `data.*` (for example, `data.host.name`). Referencing other fields won't work. Omit `matcher.expression` or set it to `null` to match on `tags` alone.";
export declare const POLICY_MATCHER_DESCRIPTION = "Selects the alerts this policy applies to. Set `tags` to match alerts from rules with those routing tags. Set `expression` to a KQL query, which will be evaluated against each alert. <br/><br/> If you set both `tags` and `expression`, an alert must match the tags and the expression for the policy to apply. When `matcher` is `null`, or when both `tags` and `expression` are empty, the policy applies to all alerts.";
export declare const POLICY_MATCHER_UPDATE_DESCRIPTION = "Selects the alerts this policy applies to. Set `tags` to match alerts from rules with those routing tags. Set `expression` to a KQL query, which will be evaluated against each alert. <br/><br/> If you set both `tags` and `expression`, an alert must match the tags and the expression for the policy to apply. When `matcher` is `null`, or when both `tags` and `expression` are empty, the policy applies to all alerts. <br/><br/> Updating `matcher` replaces it entirely: to change `tags` without dropping `expression`, resend the current `expression` value.";
export declare const policyMatcherSchema: z.ZodObject<{
    tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    expression: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type PolicyMatcher = z.infer<typeof policyMatcherSchema>;
