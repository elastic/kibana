import { z } from '@kbn/zod/v4';
export declare const CasesGroupedAlertsSchema: import("@kbn/config-schema").ObjectType<{
    alerts: import("@kbn/config-schema").Type<Record<string, any>[]>;
    comments: import("@kbn/config-schema").Type<string[] | undefined>;
    grouping: import("@kbn/config-schema").Type<Record<string, any>>;
    title: import("@kbn/config-schema").Type<string | undefined>;
}>;
/**
 * The case connector does not have any configuration
 * or secrets.
 */
export declare const CasesConnectorConfigSchema: z.ZodObject<{}, z.core.$strict>;
export declare const CasesConnectorSecretsSchema: z.ZodObject<{}, z.core.$strict>;
export declare const CasesConnectorRunParamsSchema: import("@kbn/config-schema").ObjectType<{
    alerts: import("@kbn/config-schema").Type<Record<string, any>[]>;
    autoPushCase: import("@kbn/config-schema").Type<boolean | null>;
    groupedAlerts: import("@kbn/config-schema").Type<Readonly<{
        title?: string | undefined;
        comments?: string[] | undefined;
    } & {
        alerts: Record<string, any>[];
        grouping: Record<string, any>;
    }>[] | null>;
    groupingBy: import("@kbn/config-schema").Type<string[]>;
    owner: import("@kbn/config-schema").Type<string>;
    rule: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
        name: import("@kbn/config-schema").Type<string>;
        tags: import("@kbn/config-schema").Type<string[]>;
        ruleUrl: import("@kbn/config-schema").Type<string | null>;
    }>;
    timeWindow: import("@kbn/config-schema").Type<string>;
    reopenClosedCases: import("@kbn/config-schema").Type<boolean>;
    maximumCasesToOpen: import("@kbn/config-schema").Type<number>;
    templateId: import("@kbn/config-schema").Type<string | null>;
    internallyManagedAlerts: import("@kbn/config-schema").Type<boolean | null>;
}>;
export declare const ZCasesGroupedAlertsSchema: z.ZodObject<{
    alerts: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>>;
    comments: z.ZodOptional<z.ZodArray<z.ZodString>>;
    grouping: z.ZodRecord<z.ZodString, z.ZodAny>;
    title: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const ZCasesConnectorRunParamsSchema: z.ZodObject<{
    alerts: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>>;
    autoPushCase: z.ZodDefault<z.ZodNullable<z.ZodBoolean>>;
    groupedAlerts: z.ZodNullable<z.ZodDefault<z.ZodArray<z.ZodObject<{
        alerts: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>>;
        comments: z.ZodOptional<z.ZodArray<z.ZodString>>;
        grouping: z.ZodRecord<z.ZodString, z.ZodAny>;
        title: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>>;
    groupingBy: z.ZodArray<z.ZodString>;
    owner: z.ZodString;
    rule: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
        ruleUrl: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>;
    timeWindow: z.ZodDefault<z.ZodString>;
    reopenClosedCases: z.ZodDefault<z.ZodBoolean>;
    maximumCasesToOpen: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    templateId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    internallyManagedAlerts: z.ZodNullable<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strict>;
export declare const CasesConnectorRuleActionParamsSchema: import("@kbn/config-schema").ObjectType<{
    subAction: import("@kbn/config-schema").Type<"run">;
    subActionParams: import("@kbn/config-schema").ObjectType<{
        autoPushCase: import("@kbn/config-schema").Type<boolean | null>;
        groupingBy: import("@kbn/config-schema").Type<string[]>;
        reopenClosedCases: import("@kbn/config-schema").Type<boolean>;
        timeWindow: import("@kbn/config-schema").Type<string>;
        templateId: import("@kbn/config-schema").Type<string | null>;
        maximumCasesToOpen: import("@kbn/config-schema").Type<number | null>;
    }>;
}>;
export declare const CasesConnectorParamsSchema: import("@kbn/config-schema").ObjectType<{
    subAction: import("@kbn/config-schema").Type<"run">;
    subActionParams: import("@kbn/config-schema").ObjectType<{
        alerts: import("@kbn/config-schema").Type<Record<string, any>[]>;
        autoPushCase: import("@kbn/config-schema").Type<boolean | null>;
        groupedAlerts: import("@kbn/config-schema").Type<Readonly<{
            title?: string | undefined;
            comments?: string[] | undefined;
        } & {
            alerts: Record<string, any>[];
            grouping: Record<string, any>;
        }>[] | null>;
        groupingBy: import("@kbn/config-schema").Type<string[]>;
        owner: import("@kbn/config-schema").Type<string>;
        rule: import("@kbn/config-schema").ObjectType<{
            id: import("@kbn/config-schema").Type<string>;
            name: import("@kbn/config-schema").Type<string>;
            tags: import("@kbn/config-schema").Type<string[]>;
            ruleUrl: import("@kbn/config-schema").Type<string | null>;
        }>;
        timeWindow: import("@kbn/config-schema").Type<string>;
        reopenClosedCases: import("@kbn/config-schema").Type<boolean>;
        maximumCasesToOpen: import("@kbn/config-schema").Type<number>;
        templateId: import("@kbn/config-schema").Type<string | null>;
        internallyManagedAlerts: import("@kbn/config-schema").Type<boolean | null>;
    }>;
}>;
