export declare const EnrollmentAPIKeySchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    api_key_id: import("@kbn/config-schema").Type<string>;
    api_key: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string | undefined>;
    active: import("@kbn/config-schema").Type<boolean>;
    policy_id: import("@kbn/config-schema").Type<string | undefined>;
    created_at: import("@kbn/config-schema").Type<string>;
    hidden: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
