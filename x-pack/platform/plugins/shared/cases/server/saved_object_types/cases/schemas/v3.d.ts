export declare const casesSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    assignees: import("@kbn/config-schema").Type<Readonly<{} & {
        uid: string;
    }>[]>;
    category: import("@kbn/config-schema").Type<string | null | undefined>;
    closed_at: import("@kbn/config-schema").Type<string | null>;
    closed_by: import("@kbn/config-schema").Type<Readonly<{} & {
        email: string | null;
        username: string | null;
        profile_uid: string | null;
        full_name: string | null;
    }> | null>;
    created_at: import("@kbn/config-schema").Type<string>;
    created_by: import("@kbn/config-schema").ObjectType<{
        email: import("@kbn/config-schema").Type<string | null>;
        full_name: import("@kbn/config-schema").Type<string | null>;
        username: import("@kbn/config-schema").Type<string | null>;
        profile_uid: import("@kbn/config-schema").Type<string | null>;
    }>;
    connector: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string>;
        type: import("@kbn/config-schema").Type<string>;
        fields: import("@kbn/config-schema").Type<Readonly<{} & {
            key: string;
            value: string;
        }>[]>;
    }>;
    customFields: import("@kbn/config-schema").Type<Readonly<{
        value?: any;
    } & {
        type: string;
        key: string;
    }>[] | null | undefined>;
    description: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<number | null>;
    external_service: import("@kbn/config-schema").Type<Readonly<{} & {
        connector_name: string;
        external_id: string;
        external_title: string;
        external_url: string;
        pushed_at: string;
        pushed_by: Readonly<{} & {
            email: string | null;
            username: string | null;
            profile_uid: string | null;
            full_name: string | null;
        }>;
    }> | null>;
    owner: import("@kbn/config-schema").Type<string>;
    settings: import("@kbn/config-schema").ObjectType<{
        syncAlerts: import("@kbn/config-schema").Type<boolean>;
    }>;
    severity: import("@kbn/config-schema").Type<20 | 10 | 30 | 40>;
    status: import("@kbn/config-schema").Type<0 | 20 | 10>;
    tags: import("@kbn/config-schema").Type<string[]>;
    title: import("@kbn/config-schema").Type<string>;
    total_alerts: import("@kbn/config-schema").Type<number>;
    total_comments: import("@kbn/config-schema").Type<number>;
    updated_at: import("@kbn/config-schema").Type<string | null>;
    updated_by: import("@kbn/config-schema").Type<Readonly<{} & {
        email: string | null;
        username: string | null;
        profile_uid: string | null;
        full_name: string | null;
    }> | null>;
}, "observables"> & {
    observables: import("@kbn/config-schema").Type<Readonly<{
        value?: any;
    } & {
        id: string;
        description: string | null;
        updatedAt: string | null;
        createdAt: string;
        typeKey: string;
    }>[] | null | undefined>;
}, "incremental_id"> & {
    incremental_id: import("@kbn/config-schema").Type<number | null | undefined>;
}>;
