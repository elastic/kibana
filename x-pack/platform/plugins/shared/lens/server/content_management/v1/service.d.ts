import type { LensAttributes, LensGetOut, LensSavedObject } from './types';
export declare const serviceDefinition: {
    get: {
        out: {
            result: {
                schema: import("@kbn/config-schema").ObjectType<{
                    item: import("@kbn/config-schema").ObjectType<{
                        id: import("@kbn/config-schema").Type<string>;
                        type: import("@kbn/config-schema").Type<string>;
                        version: import("@kbn/config-schema").Type<string | undefined>;
                        createdAt: import("@kbn/config-schema").Type<string | undefined>;
                        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
                        createdBy: import("@kbn/config-schema").Type<string | undefined>;
                        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
                        error: import("@kbn/config-schema").Type<Readonly<{} & {
                            error: string;
                            message: string;
                            statusCode: number;
                            metadata: Readonly<{} & {}>;
                        }> | undefined>;
                        attributes: import("@kbn/config-schema").ObjectType<{
                            title: import("@kbn/config-schema").Type<string>;
                            description: import("@kbn/config-schema").Type<string | undefined>;
                            visualizationType: import("@kbn/config-schema").Type<string>;
                            state: import("@kbn/config-schema").Type<any>;
                            version: import("@kbn/config-schema").Type<1 | undefined>;
                        }>;
                        references: import("@kbn/config-schema").Type<Readonly<{} & {
                            id: string;
                            type: string;
                            name: string;
                        }>[]>;
                        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
                        originId: import("@kbn/config-schema").Type<string | undefined>;
                        managed: import("@kbn/config-schema").Type<boolean | undefined>;
                    }>;
                    meta: import("@kbn/config-schema").ObjectType<{
                        outcome: import("@kbn/config-schema").Type<"exactMatch" | "aliasMatch" | "conflict">;
                        aliasTargetId: import("@kbn/config-schema").Type<string | undefined>;
                        aliasPurpose: import("@kbn/config-schema").Type<"savedObjectConversion" | "savedObjectImport" | undefined>;
                    }>;
                }>;
                up: (result: LensGetOut) => {
                    item: import("../../../common/content_management/v1").LensSavedObjectV1;
                    meta: {
                        outcome: "exactMatch" | "aliasMatch" | "conflict";
                        aliasTargetId?: string;
                        aliasPurpose?: "savedObjectConversion" | "savedObjectImport";
                    };
                };
            };
        };
    };
    create: {
        in: {
            data: {
                schema: import("@kbn/config-schema").ObjectType<{
                    title: import("@kbn/config-schema").Type<string>;
                    description: import("@kbn/config-schema").Type<string | undefined>;
                    visualizationType: import("@kbn/config-schema").Type<string>;
                    state: import("@kbn/config-schema").Type<any>;
                    version: import("@kbn/config-schema").Type<1 | undefined>;
                }>;
                up: (attributes: LensAttributes) => Readonly<{
                    state?: any;
                    description?: string | undefined;
                    version?: 1 | undefined;
                } & {
                    title: string;
                    visualizationType: string;
                }>;
            };
            options: {
                schema: import("@kbn/config-schema").ObjectType<{
                    id: import("@kbn/config-schema").Type<string | undefined>;
                    overwrite: import("@kbn/config-schema").Type<boolean | undefined>;
                    references: import("@kbn/config-schema").Type<Readonly<{} & {
                        id: string;
                        type: string;
                        name: string;
                    }>[] | undefined>;
                }>;
            };
        };
        out: {
            result: {
                schema: import("@kbn/config-schema").ObjectType<{
                    item: import("@kbn/config-schema").ObjectType<{
                        id: import("@kbn/config-schema").Type<string>;
                        type: import("@kbn/config-schema").Type<string>;
                        version: import("@kbn/config-schema").Type<string | undefined>;
                        createdAt: import("@kbn/config-schema").Type<string | undefined>;
                        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
                        createdBy: import("@kbn/config-schema").Type<string | undefined>;
                        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
                        error: import("@kbn/config-schema").Type<Readonly<{} & {
                            error: string;
                            message: string;
                            statusCode: number;
                            metadata: Readonly<{} & {}>;
                        }> | undefined>;
                        attributes: import("@kbn/config-schema").ObjectType<{
                            title: import("@kbn/config-schema").Type<string>;
                            description: import("@kbn/config-schema").Type<string | undefined>;
                            visualizationType: import("@kbn/config-schema").Type<string>;
                            state: import("@kbn/config-schema").Type<any>;
                            version: import("@kbn/config-schema").Type<1 | undefined>;
                        }>;
                        references: import("@kbn/config-schema").Type<Readonly<{} & {
                            id: string;
                            type: string;
                            name: string;
                        }>[]>;
                        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
                        originId: import("@kbn/config-schema").Type<string | undefined>;
                        managed: import("@kbn/config-schema").Type<boolean | undefined>;
                    }>;
                }>;
            };
        };
    };
    update: {
        in: {
            data: {
                schema: import("@kbn/config-schema").ObjectType<{
                    title: import("@kbn/config-schema").Type<string>;
                    description: import("@kbn/config-schema").Type<string | undefined>;
                    visualizationType: import("@kbn/config-schema").Type<string>;
                    state: import("@kbn/config-schema").Type<any>;
                    version: import("@kbn/config-schema").Type<1 | undefined>;
                }>;
                up: (attributes: LensAttributes) => Readonly<{
                    state?: any;
                    description?: string | undefined;
                    version?: 1 | undefined;
                } & {
                    title: string;
                    visualizationType: string;
                }>;
            };
            options: {
                schema: import("@kbn/config-schema").ObjectType<{
                    references: import("@kbn/config-schema").Type<Readonly<{} & {
                        id: string;
                        type: string;
                        name: string;
                    }>[] | undefined>;
                }>;
            };
        };
        out: {
            result: {
                schema: import("@kbn/config-schema").ObjectType<{
                    item: import("@kbn/config-schema").ObjectType<{
                        id: import("@kbn/config-schema").Type<string>;
                        type: import("@kbn/config-schema").Type<string>;
                        version: import("@kbn/config-schema").Type<string | undefined>;
                        createdAt: import("@kbn/config-schema").Type<string | undefined>;
                        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
                        createdBy: import("@kbn/config-schema").Type<string | undefined>;
                        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
                        error: import("@kbn/config-schema").Type<Readonly<{} & {
                            error: string;
                            message: string;
                            statusCode: number;
                            metadata: Readonly<{} & {}>;
                        }> | undefined>;
                        attributes: import("@kbn/config-schema").ObjectType<{
                            title: import("@kbn/config-schema").Type<string>;
                            description: import("@kbn/config-schema").Type<string | undefined>;
                            visualizationType: import("@kbn/config-schema").Type<string>;
                            state: import("@kbn/config-schema").Type<any>;
                            version: import("@kbn/config-schema").Type<1 | undefined>;
                        }>;
                        references: import("@kbn/config-schema").Type<Readonly<{} & {
                            id: string;
                            type: string;
                            name: string;
                        }>[]>;
                        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
                        originId: import("@kbn/config-schema").Type<string | undefined>;
                        managed: import("@kbn/config-schema").Type<boolean | undefined>;
                    }>;
                }>;
            };
        };
    };
    search: {
        in: {
            options: {
                schema: import("@kbn/config-schema").ObjectType<{
                    fields: import("@kbn/config-schema").Type<string[] | undefined>;
                    searchFields: import("@kbn/config-schema").Type<string | string[] | undefined>;
                }>;
            };
        };
        out: {
            result: {
                schema: import("@kbn/config-schema").ObjectType<{
                    meta?: undefined;
                    hits: import("@kbn/config-schema").Type<Readonly<{
                        [x: string]: any;
                    } & {}>[]>;
                    pagination: import("@kbn/config-schema").ObjectType<{
                        total: import("@kbn/config-schema").Type<number>;
                        cursor: import("@kbn/config-schema").Type<string | undefined>;
                    }>;
                }>;
                up: (item: LensSavedObject) => import("../../../common/content_management/v1").LensSavedObjectV1;
            };
        };
    };
};
