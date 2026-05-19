export declare const CustomIntegrationRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        readMeData: import("@kbn/config-schema").Type<string>;
        categories: import("@kbn/config-schema").Type<string[] | undefined>;
    }>;
    params: import("@kbn/config-schema").ObjectType<{
        pkgName: import("@kbn/config-schema").Type<string>;
    }>;
};
