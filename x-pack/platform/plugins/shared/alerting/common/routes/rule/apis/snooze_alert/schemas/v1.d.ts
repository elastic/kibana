import type { Type } from '@kbn/config-schema';
import { type AlertSeverity } from '@kbn/rule-data-utils';
export declare const snoozeAlertParamsSchema: import("@kbn/config-schema").ObjectType<{
    rule_id: Type<string>;
    alert_id: Type<string>;
}>;
export declare const snoozeAlertQuerySchema: Type<Readonly<{
    validate_alerts_existence?: boolean | undefined;
} & {}> | undefined>;
export declare const snoozeAlertBodySchema: import("@kbn/config-schema").ObjectType<{
    expires_at: Type<string | undefined>;
    conditions: Type<(Readonly<{} & {
        type: "field_change";
        field: string;
    }> | Readonly<{} & {
        type: "severity_change";
    }> | Readonly<{} & {
        value: AlertSeverity;
        type: "severity_equals";
    }>)[] | undefined>;
    condition_operator: Type<"all" | "any" | undefined>;
}>;
