export declare const actionVariableSchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string>;
    usesPublicBaseUrl: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const actionGroupSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string>;
}>;
export declare const typesRulesSchema: import("@kbn/config-schema").ObjectType<{
    action_groups: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
    }>[] | undefined>;
    action_variables: import("@kbn/config-schema").Type<Readonly<{
        context?: Readonly<{
            usesPublicBaseUrl?: boolean | undefined;
        } & {
            name: string;
            description: string;
        }>[] | undefined;
        params?: Readonly<{
            usesPublicBaseUrl?: boolean | undefined;
        } & {
            name: string;
            description: string;
        }>[] | undefined;
        state?: Readonly<{
            usesPublicBaseUrl?: boolean | undefined;
        } & {
            name: string;
            description: string;
        }>[] | undefined;
    } & {}> | undefined>;
    alerts: import("@kbn/config-schema").Type<Readonly<{
        mappings?: Readonly<{
            dynamic?: false | "strict" | undefined;
            useEcs?: boolean | undefined;
            shouldWrite?: boolean | undefined;
        } & {
            fieldMap: Record<string, any>;
        }> | undefined;
    } & {
        context: string;
    }> | undefined>;
    authorized_consumers: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
        all: boolean;
        read: boolean;
    }>>>;
    auto_recover_alerts: import("@kbn/config-schema").Type<boolean | undefined>;
    category: import("@kbn/config-schema").Type<string>;
    default_action_group_id: import("@kbn/config-schema").Type<string>;
    default_schedule_interval: import("@kbn/config-schema").Type<string | undefined>;
    does_set_recovery_context: import("@kbn/config-schema").Type<boolean | undefined>;
    enabled_in_license: import("@kbn/config-schema").Type<boolean>;
    fieldsForAAD: import("@kbn/config-schema").Type<string[] | undefined>;
    has_alerts_mappings: import("@kbn/config-schema").Type<boolean>;
    has_fields_for_a_a_d: import("@kbn/config-schema").Type<boolean>;
    id: import("@kbn/config-schema").Type<string>;
    is_internally_managed: import("@kbn/config-schema").Type<boolean>;
    is_exportable: import("@kbn/config-schema").Type<boolean>;
    minimum_license_required: import("@kbn/config-schema").Type<"basic" | "standard" | "gold" | "platinum" | "enterprise" | "trial">;
    name: import("@kbn/config-schema").Type<string>;
    producer: import("@kbn/config-schema").Type<string>;
    recovery_action_group: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
        name: import("@kbn/config-schema").Type<string>;
    }>;
    rule_task_timeout: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const typesRulesResponseBodySchema: import("@kbn/config-schema").Type<Readonly<{
    alerts?: Readonly<{
        mappings?: Readonly<{
            dynamic?: false | "strict" | undefined;
            useEcs?: boolean | undefined;
            shouldWrite?: boolean | undefined;
        } & {
            fieldMap: Record<string, any>;
        }> | undefined;
    } & {
        context: string;
    }> | undefined;
    action_groups?: Readonly<{} & {
        name: string;
        id: string;
    }>[] | undefined;
    action_variables?: Readonly<{
        context?: Readonly<{
            usesPublicBaseUrl?: boolean | undefined;
        } & {
            name: string;
            description: string;
        }>[] | undefined;
        params?: Readonly<{
            usesPublicBaseUrl?: boolean | undefined;
        } & {
            name: string;
            description: string;
        }>[] | undefined;
        state?: Readonly<{
            usesPublicBaseUrl?: boolean | undefined;
        } & {
            name: string;
            description: string;
        }>[] | undefined;
    } & {}> | undefined;
    auto_recover_alerts?: boolean | undefined;
    default_schedule_interval?: string | undefined;
    does_set_recovery_context?: boolean | undefined;
    fieldsForAAD?: string[] | undefined;
    rule_task_timeout?: string | undefined;
} & {
    name: string;
    id: string;
    category: string;
    enabled_in_license: boolean;
    minimum_license_required: "basic" | "standard" | "gold" | "platinum" | "enterprise" | "trial";
    producer: string;
    authorized_consumers: Record<string, Readonly<{} & {
        all: boolean;
        read: boolean;
    }>>;
    default_action_group_id: string;
    has_alerts_mappings: boolean;
    has_fields_for_a_a_d: boolean;
    is_internally_managed: boolean;
    is_exportable: boolean;
    recovery_action_group: Readonly<{} & {
        name: string;
        id: string;
    }>;
}>[]>;
export declare const typesRulesResponseSchema: import("@kbn/config-schema").ObjectType<{
    body: import("@kbn/config-schema").Type<Readonly<{
        alerts?: Readonly<{
            mappings?: Readonly<{
                dynamic?: false | "strict" | undefined;
                useEcs?: boolean | undefined;
                shouldWrite?: boolean | undefined;
            } & {
                fieldMap: Record<string, any>;
            }> | undefined;
        } & {
            context: string;
        }> | undefined;
        action_groups?: Readonly<{} & {
            name: string;
            id: string;
        }>[] | undefined;
        action_variables?: Readonly<{
            context?: Readonly<{
                usesPublicBaseUrl?: boolean | undefined;
            } & {
                name: string;
                description: string;
            }>[] | undefined;
            params?: Readonly<{
                usesPublicBaseUrl?: boolean | undefined;
            } & {
                name: string;
                description: string;
            }>[] | undefined;
            state?: Readonly<{
                usesPublicBaseUrl?: boolean | undefined;
            } & {
                name: string;
                description: string;
            }>[] | undefined;
        } & {}> | undefined;
        auto_recover_alerts?: boolean | undefined;
        default_schedule_interval?: string | undefined;
        does_set_recovery_context?: boolean | undefined;
        fieldsForAAD?: string[] | undefined;
        rule_task_timeout?: string | undefined;
    } & {
        name: string;
        id: string;
        category: string;
        enabled_in_license: boolean;
        minimum_license_required: "basic" | "standard" | "gold" | "platinum" | "enterprise" | "trial";
        producer: string;
        authorized_consumers: Record<string, Readonly<{} & {
            all: boolean;
            read: boolean;
        }>>;
        default_action_group_id: string;
        has_alerts_mappings: boolean;
        has_fields_for_a_a_d: boolean;
        is_internally_managed: boolean;
        is_exportable: boolean;
        recovery_action_group: Readonly<{} & {
            name: string;
            id: string;
        }>;
    }>[]>;
}>;
