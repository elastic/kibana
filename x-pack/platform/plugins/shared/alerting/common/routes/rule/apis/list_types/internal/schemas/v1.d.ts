export declare const getRuleTypesInternalResponseBodySchema: import("@kbn/config-schema").Type<Readonly<{
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
        id: string;
        name: string;
    }>[] | undefined;
    rule_task_timeout?: string | undefined;
    default_schedule_interval?: string | undefined;
    does_set_recovery_context?: boolean | undefined;
    auto_recover_alerts?: boolean | undefined;
    action_variables?: Readonly<{
        context?: Readonly<{
            usesPublicBaseUrl?: boolean | undefined;
        } & {
            description: string;
            name: string;
        }>[] | undefined;
        state?: Readonly<{
            usesPublicBaseUrl?: boolean | undefined;
        } & {
            description: string;
            name: string;
        }>[] | undefined;
        params?: Readonly<{
            usesPublicBaseUrl?: boolean | undefined;
        } & {
            description: string;
            name: string;
        }>[] | undefined;
    } & {}> | undefined;
} & {
    id: string;
    name: string;
    category: string;
    solution: "security" | "stack" | "observability";
    producer: string;
    minimum_license_required: "basic" | "standard" | "gold" | "platinum" | "enterprise" | "trial";
    enabled_in_license: boolean;
    recovery_action_group: Readonly<{} & {
        id: string;
        name: string;
    }>;
    default_action_group_id: string;
    is_exportable: boolean;
    authorized_consumers: Record<string, Readonly<{} & {
        all: boolean;
        read: boolean;
    }>>;
    has_alerts_mappings: boolean;
    is_internally_managed: boolean;
}>[]>;
export declare const getRuleTypesInternalResponseSchema: import("@kbn/config-schema").ObjectType<{
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
            id: string;
            name: string;
        }>[] | undefined;
        rule_task_timeout?: string | undefined;
        default_schedule_interval?: string | undefined;
        does_set_recovery_context?: boolean | undefined;
        auto_recover_alerts?: boolean | undefined;
        action_variables?: Readonly<{
            context?: Readonly<{
                usesPublicBaseUrl?: boolean | undefined;
            } & {
                description: string;
                name: string;
            }>[] | undefined;
            state?: Readonly<{
                usesPublicBaseUrl?: boolean | undefined;
            } & {
                description: string;
                name: string;
            }>[] | undefined;
            params?: Readonly<{
                usesPublicBaseUrl?: boolean | undefined;
            } & {
                description: string;
                name: string;
            }>[] | undefined;
        } & {}> | undefined;
    } & {
        id: string;
        name: string;
        category: string;
        solution: "security" | "stack" | "observability";
        producer: string;
        minimum_license_required: "basic" | "standard" | "gold" | "platinum" | "enterprise" | "trial";
        enabled_in_license: boolean;
        recovery_action_group: Readonly<{} & {
            id: string;
            name: string;
        }>;
        default_action_group_id: string;
        is_exportable: boolean;
        authorized_consumers: Record<string, Readonly<{} & {
            all: boolean;
            read: boolean;
        }>>;
        has_alerts_mappings: boolean;
        is_internally_managed: boolean;
    }>[]>;
}>;
