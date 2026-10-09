/**
 * Alerting v1 / Fleet (`.es-query`) template layout with optional engine field.
 */
export declare const alertingV1RawRuleTemplateSchemaV4: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    name: import("@kbn/config-schema").Type<string>;
    tags: import("@kbn/config-schema").Type<string[]>;
    ruleTypeId: import("@kbn/config-schema").Type<string>;
    schedule: import("@kbn/config-schema").ObjectType<{
        interval: import("@kbn/config-schema").Type<string>;
    }>;
    flapping: import("@kbn/config-schema").Type<Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined>;
    alertDelay: import("@kbn/config-schema").Type<Readonly<{} & {
        active: number;
    }> | undefined>;
    params: import("@kbn/config-schema").Type<Record<string, any>>;
}, "artifacts" | "description"> & {
    description: import("@kbn/config-schema").Type<string | undefined>;
    artifacts: import("@kbn/config-schema").Type<Readonly<{
        dashboards?: Readonly<{} & {
            id: string;
        }>[] | undefined;
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
    } & {}> | undefined>;
}, "engine"> & {
    engine: import("@kbn/config-schema").Type<string | undefined>;
}>;
/**
 * Alerting v2 template layout.
 *
 * Create-rule fields live under `rule` as an opaque bag so the SO schema does not
 * duplicate `@kbn/alerting-v2-schemas` create-rule validation. Full validation of
 * `rule` (including create-rule refines) is owned by Zod (`ruleTemplateDataSchema`).
 */
export declare const alertingV2RawRuleTemplateSchemaV4: import("@kbn/config-schema").ObjectType<{
    engine: import("@kbn/config-schema").Type<"v2">;
    rule: import("@kbn/config-schema").ObjectType<{}>;
}>;
/**
 * Create/read schema for model version 4: alerting v1 or alerting v2 schema.
 */
export declare const rawRuleTemplateSchema: import("@kbn/config-schema").Type<Readonly<{
    flapping?: Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined;
    alertDelay?: Readonly<{} & {
        active: number;
    }> | undefined;
    description?: string | undefined;
    artifacts?: Readonly<{
        dashboards?: Readonly<{} & {
            id: string;
        }>[] | undefined;
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
    } & {}> | undefined;
    engine?: string | undefined;
} & {
    name: string;
    tags: string[];
    ruleTypeId: string;
    schedule: Readonly<{} & {
        interval: string;
    }>;
    params: Record<string, any>;
}> | Readonly<{} & {
    engine: "v2";
    rule: Readonly<{} & {}>;
}>>;
