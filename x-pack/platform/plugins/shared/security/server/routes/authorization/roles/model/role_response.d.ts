export declare const roleResponseSchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    elasticsearch: import("@kbn/config-schema").ObjectType<{
        cluster: import("@kbn/config-schema").Type<string[] | undefined>;
        remote_cluster: import("@kbn/config-schema").Type<Readonly<{} & {
            privileges: string[];
            clusters: string[];
        }>[] | undefined>;
        indices: import("@kbn/config-schema").Type<Readonly<{
            query?: string | undefined;
            field_security?: Record<"grant" | "except", string[]> | undefined;
            allow_restricted_indices?: boolean | undefined;
        } & {
            names: string[];
            privileges: string[];
        }>[] | undefined>;
        remote_indices: import("@kbn/config-schema").Type<Readonly<{
            query?: string | undefined;
            field_security?: Record<"grant" | "except", string[]> | undefined;
            allow_restricted_indices?: boolean | undefined;
        } & {
            names: string[];
            privileges: string[];
            clusters: string[];
        }>[] | undefined>;
        run_as: import("@kbn/config-schema").Type<string[] | undefined>;
    }>;
    kibana: import("@kbn/config-schema").Type<Readonly<{
        _reserved?: string[] | undefined;
    } & {
        spaces: string[];
        feature: Record<string, string[]>;
        base: string[];
    }>[]>;
    metadata: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    transient_metadata: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    _transform_error: import("@kbn/config-schema").Type<Readonly<{
        state?: Readonly<{} & {
            application: string;
            resources: string[];
            privileges: string[];
        }>[] | undefined;
    } & {
        reason: string;
    }>[] | undefined>;
    _unrecognized_applications: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export declare const getRolesResponseSchema: import("@kbn/config-schema").Type<Readonly<{
    metadata?: Record<string, any> | undefined;
    description?: string | undefined;
    transient_metadata?: Record<string, any> | undefined;
    _transform_error?: Readonly<{
        state?: Readonly<{} & {
            application: string;
            resources: string[];
            privileges: string[];
        }>[] | undefined;
    } & {
        reason: string;
    }>[] | undefined;
    _unrecognized_applications?: string[] | undefined;
} & {
    kibana: Readonly<{
        _reserved?: string[] | undefined;
    } & {
        spaces: string[];
        feature: Record<string, string[]>;
        base: string[];
    }>[];
    name: string;
    elasticsearch: Readonly<{
        indices?: Readonly<{
            query?: string | undefined;
            field_security?: Record<"grant" | "except", string[]> | undefined;
            allow_restricted_indices?: boolean | undefined;
        } & {
            names: string[];
            privileges: string[];
        }>[] | undefined;
        cluster?: string[] | undefined;
        remote_cluster?: Readonly<{} & {
            privileges: string[];
            clusters: string[];
        }>[] | undefined;
        remote_indices?: Readonly<{
            query?: string | undefined;
            field_security?: Record<"grant" | "except", string[]> | undefined;
            allow_restricted_indices?: boolean | undefined;
        } & {
            names: string[];
            privileges: string[];
            clusters: string[];
        }>[] | undefined;
        run_as?: string[] | undefined;
    } & {}>;
}>[]>;
export declare const queryRolesResponseSchema: import("@kbn/config-schema").ObjectType<{
    roles: import("@kbn/config-schema").Type<Readonly<{
        metadata?: Record<string, any> | undefined;
        description?: string | undefined;
        transient_metadata?: Record<string, any> | undefined;
        _transform_error?: Readonly<{
            state?: Readonly<{} & {
                application: string;
                resources: string[];
                privileges: string[];
            }>[] | undefined;
        } & {
            reason: string;
        }>[] | undefined;
        _unrecognized_applications?: string[] | undefined;
    } & {
        kibana: Readonly<{
            _reserved?: string[] | undefined;
        } & {
            spaces: string[];
            feature: Record<string, string[]>;
            base: string[];
        }>[];
        name: string;
        elasticsearch: Readonly<{
            indices?: Readonly<{
                query?: string | undefined;
                field_security?: Record<"grant" | "except", string[]> | undefined;
                allow_restricted_indices?: boolean | undefined;
            } & {
                names: string[];
                privileges: string[];
            }>[] | undefined;
            cluster?: string[] | undefined;
            remote_cluster?: Readonly<{} & {
                privileges: string[];
                clusters: string[];
            }>[] | undefined;
            remote_indices?: Readonly<{
                query?: string | undefined;
                field_security?: Record<"grant" | "except", string[]> | undefined;
                allow_restricted_indices?: boolean | undefined;
            } & {
                names: string[];
                privileges: string[];
                clusters: string[];
            }>[] | undefined;
            run_as?: string[] | undefined;
        } & {}>;
    }>[]>;
    count: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
}>;
export declare const bulkCreateOrUpdateRolesResponseSchema: import("@kbn/config-schema").ObjectType<{
    created: import("@kbn/config-schema").Type<string[] | undefined>;
    updated: import("@kbn/config-schema").Type<string[] | undefined>;
    noop: import("@kbn/config-schema").Type<string[] | undefined>;
    errors: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
        type: string;
        reason: string;
    }>> | undefined>;
}>;
