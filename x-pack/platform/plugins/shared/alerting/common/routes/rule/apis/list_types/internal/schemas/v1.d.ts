export declare const getRuleTypesInternalResponseBodySchema: import("@kbn/config-schema").Type<Readonly<{
    action_groups?: Readonly<{} & {
        id: string;
        name: string;
    }>[] | undefined;
    action_variables?: Readonly<{
        context?: Readonly<{
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
        params?: Readonly<{
            usesPublicBaseUrl?: boolean | undefined;
        } & {
            name: string;
            description: string;
        }>[] | undefined;
    } & {}> | undefined;
    alerts?: Readonly<{
        mappings?: Readonly<{
            dynamic?: "strict" | false | undefined;
            shouldWrite?: boolean | undefined;
            useEcs?: boolean | undefined;
        } & {
            fieldMap: Record<string, any>;
        }> | undefined;
    } & {
        context: string;
    }> | undefined;
    auto_recover_alerts?: boolean | undefined;
    default_schedule_interval?: string | undefined;
    does_set_recovery_context?: boolean | undefined;
    rule_task_timeout?: string | undefined;
} & {
    solution: "observability" | "security" | "stack";
    authorized_consumers: Record<string, Readonly<{} & {
        read: boolean;
        all: boolean;
    }>>;
    category: string;
    default_action_group_id: string;
    enabled_in_license: boolean;
    has_alerts_mappings: boolean;
    id: string;
    is_internally_managed: boolean;
    is_exportable: boolean;
    minimum_license_required: "basic" | "enterprise" | "gold" | "platinum" | "standard" | "trial";
    name: string;
    producer: string;
    recovery_action_group: Readonly<{} & {
        id: string;
        name: string;
    }>;
}>[]>;
export declare const getRuleTypesInternalResponseSchema: import("@kbn/config-schema").ObjectType<{
    body: import("@kbn/config-schema").Type<Readonly<{
        action_groups?: Readonly<{} & {
            id: string;
            name: string;
        }>[] | undefined;
        action_variables?: Readonly<{
            context?: Readonly<{
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
            params?: Readonly<{
                usesPublicBaseUrl?: boolean | undefined;
            } & {
                name: string;
                description: string;
            }>[] | undefined;
        } & {}> | undefined;
        alerts?: Readonly<{
            mappings?: Readonly<{
                dynamic?: "strict" | false | undefined;
                shouldWrite?: boolean | undefined;
                useEcs?: boolean | undefined;
            } & {
                fieldMap: Record<string, any>;
            }> | undefined;
        } & {
            context: string;
        }> | undefined;
        auto_recover_alerts?: boolean | undefined;
        default_schedule_interval?: string | undefined;
        does_set_recovery_context?: boolean | undefined;
        rule_task_timeout?: string | undefined;
    } & {
        solution: "observability" | "security" | "stack";
        authorized_consumers: Record<string, Readonly<{} & {
            read: boolean;
            all: boolean;
        }>>;
        category: string;
        default_action_group_id: string;
        enabled_in_license: boolean;
        has_alerts_mappings: boolean;
        id: string;
        is_internally_managed: boolean;
        is_exportable: boolean;
        minimum_license_required: "basic" | "enterprise" | "gold" | "platinum" | "standard" | "trial";
        name: string;
        producer: string;
        recovery_action_group: Readonly<{} & {
            id: string;
            name: string;
        }>;
    }>[]>;
}>;
