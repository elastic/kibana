/**
 * @deprecated - use `v1` schemas
 */
export declare const lensCMGetResultSchemaV0: import("@kbn/config-schema").ObjectType<{
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
            description: import("@kbn/config-schema").Type<string | null | undefined>;
            visualizationType: import("@kbn/config-schema").Type<string | null | undefined>;
            state: import("@kbn/config-schema").Type<any>;
            uiStateJSON: import("@kbn/config-schema").Type<string | undefined>;
            visState: import("@kbn/config-schema").Type<string | undefined>;
            savedSearchRefName: import("@kbn/config-schema").Type<string | undefined>;
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
