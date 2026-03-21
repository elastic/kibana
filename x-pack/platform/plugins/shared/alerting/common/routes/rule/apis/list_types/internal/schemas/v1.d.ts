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
    auto_recover_alerts?: boolean | undefined;
    default_schedule_interval?: string | undefined;
    does_set_recovery_context?: boolean | undefined;
    rule_task_timeout?: string | undefined;
} & {
    id: string;
    name: string;
    category: string;
    solution: "security" | "observability" | "stack";
    enabled_in_license: boolean;
    minimum_license_required: "gold" | "standard" | "basic" | "platinum" | "enterprise" | "trial";
    producer: string;
    authorized_consumers: Record<string, Readonly<{} & {
        all: boolean;
        read: boolean;
    }>>;
    default_action_group_id: string;
    has_alerts_mappings: boolean;
    is_internally_managed: boolean;
    is_exportable: boolean;
    recovery_action_group: Readonly<{} & {
        id: string;
        name: string;
    }>;
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
        auto_recover_alerts?: boolean | undefined;
        default_schedule_interval?: string | undefined;
        does_set_recovery_context?: boolean | undefined;
        rule_task_timeout?: string | undefined;
    } & {
        id: string;
        name: string;
        category: string;
        solution: "security" | "observability" | "stack";
        enabled_in_license: boolean;
        minimum_license_required: "gold" | "standard" | "basic" | "platinum" | "enterprise" | "trial";
        producer: string;
        authorized_consumers: Record<string, Readonly<{} & {
            all: boolean;
            read: boolean;
        }>>;
        default_action_group_id: string;
        has_alerts_mappings: boolean;
        is_internally_managed: boolean;
        is_exportable: boolean;
        recovery_action_group: Readonly<{} & {
            id: string;
            name: string;
        }>;
    }>[]>;
}>;
