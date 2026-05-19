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
                            metadata: Readonly<{} & {}>;
                            error: string;
                            message: string;
                            statusCode: number;
                        }> | undefined>;
                        attributes: import("@kbn/config-schema").ObjectType<{
                            title: import("@kbn/config-schema").Type<string>;
                            description: import("@kbn/config-schema").Type<string | undefined>;
                            visualizationType: import("@kbn/config-schema").Type<string>;
                            state: import("@kbn/config-schema").Type<any>;
                            version: import("@kbn/config-schema").Type<2 | undefined>;
                        }>;
                        references: import("@kbn/config-schema").Type<Readonly<{} & {
                            name: string;
                            id: string;
                            type: string;
                        }>[]>;
                        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
                        originId: import("@kbn/config-schema").Type<string | undefined>;
                        managed: import("@kbn/config-schema").Type<boolean | undefined>;
                    }>;
                    meta: import("@kbn/config-schema").ObjectType<{
                        outcome: import("@kbn/config-schema").Type<"conflict" | "exactMatch" | "aliasMatch">;
                        aliasTargetId: import("@kbn/config-schema").Type<string | undefined>;
                        aliasPurpose: import("@kbn/config-schema").Type<"savedObjectConversion" | "savedObjectImport" | undefined>;
                    }>;
                }>;
                up: (result: LensGetOut) => {
                    item: import("../../../common/content_management/v2").LensSavedObjectV2;
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
                    version: import("@kbn/config-schema").Type<2 | undefined>;
                }>;
                up: (attributes: LensAttributes) => Readonly<{
                    state?: any;
                    version?: 2 | undefined;
                    description?: string | undefined;
                } & {
                    title: string;
                    visualizationType: string;
                }>;
            };
            options: {
                schema: import("@kbn/config-schema").ObjectType<{
                    id: import("@kbn/config-schema").Type<string | undefined>;
                    references: import("@kbn/config-schema").Type<Readonly<{} & {
                        name: string;
                        id: string;
                        type: string;
                    }>[] | undefined>;
                    overwrite: import("@kbn/config-schema").Type<boolean | undefined>;
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
                            metadata: Readonly<{} & {}>;
                            error: string;
                            message: string;
                            statusCode: number;
                        }> | undefined>;
                        attributes: import("@kbn/config-schema").ObjectType<{
                            title: import("@kbn/config-schema").Type<string>;
                            description: import("@kbn/config-schema").Type<string | undefined>;
                            visualizationType: import("@kbn/config-schema").Type<string>;
                            state: import("@kbn/config-schema").Type<any>;
                            version: import("@kbn/config-schema").Type<2 | undefined>;
                        }>;
                        references: import("@kbn/config-schema").Type<Readonly<{} & {
                            name: string;
                            id: string;
                            type: string;
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
                    version: import("@kbn/config-schema").Type<2 | undefined>;
                }>;
                up: (attributes: LensAttributes) => Readonly<{
                    state?: any;
                    version?: 2 | undefined;
                    description?: string | undefined;
                } & {
                    title: string;
                    visualizationType: string;
                }>;
            };
            options: {
                schema: import("@kbn/config-schema").ObjectType<{
                    references: import("@kbn/config-schema").Type<Readonly<{} & {
                        name: string;
                        id: string;
                        type: string;
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
                            metadata: Readonly<{} & {}>;
                            error: string;
                            message: string;
                            statusCode: number;
                        }> | undefined>;
                        attributes: import("@kbn/config-schema").ObjectType<{
                            title: import("@kbn/config-schema").Type<string>;
                            description: import("@kbn/config-schema").Type<string | undefined>;
                            visualizationType: import("@kbn/config-schema").Type<string>;
                            state: import("@kbn/config-schema").Type<any>;
                            version: import("@kbn/config-schema").Type<2 | undefined>;
                        }>;
                        references: import("@kbn/config-schema").Type<Readonly<{} & {
                            name: string;
                            id: string;
                            type: string;
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
                up: (item: LensSavedObject) => import("../../../common/content_management/v2").LensSavedObjectV2;
            };
        };
    };
};
