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
                            description: import("@kbn/config-schema").Type<string | null | undefined>;
                            visualizationType: import("@kbn/config-schema").Type<string | null | undefined>;
                            state: import("@kbn/config-schema").Type<any>;
                            uiStateJSON: import("@kbn/config-schema").Type<string | undefined>;
                            visState: import("@kbn/config-schema").Type<string | undefined>;
                            savedSearchRefName: import("@kbn/config-schema").Type<string | undefined>;
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
            };
        };
    };
};
