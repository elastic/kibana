export declare const genericErrorResponse: () => import("@kbn/config-schema").ObjectType<{
    statusCode: import("@kbn/config-schema").Type<number | undefined>;
    error: import("@kbn/config-schema").Type<string | undefined>;
    errorType: import("@kbn/config-schema").Type<string | undefined>;
    message: import("@kbn/config-schema").Type<string>;
    attributes: import("@kbn/config-schema").Type<any>;
}>;
export declare const notFoundResponse: () => import("@kbn/config-schema").ObjectType<{
    message: import("@kbn/config-schema").Type<string>;
}>;
export declare const internalErrorResponse: () => import("@kbn/config-schema").ObjectType<{
    message: import("@kbn/config-schema").Type<string>;
}>;
