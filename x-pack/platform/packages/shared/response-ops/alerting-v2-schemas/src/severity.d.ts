import { z } from '@kbn/zod/v4';
/**
 * Canonical alert event severity schema, shared across the alerting_v2 plugin, the schemas
 * package, and the rule builder. Built from the runtime-light {@link SEVERITY_LEVELS} tuple so
 * browser-shared consumers can import the ordered values without pulling Zod into their bundle.
 */
export declare const alertEventSeveritySchema: z.ZodEnum<{
    critical: "critical";
    high: "high";
    info: "info";
    low: "low";
    medium: "medium";
}>;
export declare const alertEventSeverity: {
    critical: "critical";
    high: "high";
    info: "info";
    low: "low";
    medium: "medium";
};
export type AlertEventSeverity = z.infer<typeof alertEventSeveritySchema>;
