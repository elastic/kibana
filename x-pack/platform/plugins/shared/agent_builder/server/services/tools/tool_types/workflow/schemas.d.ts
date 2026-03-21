export declare const configurationSchema: import("@kbn/config-schema").ObjectType<{
    workflow_id: import("@kbn/config-schema").Type<string>;
    wait_for_completion: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const configurationUpdateSchema: import("@kbn/config-schema").ObjectType<{
    workflow_id: import("@kbn/config-schema").Type<string | undefined>;
    wait_for_completion: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
