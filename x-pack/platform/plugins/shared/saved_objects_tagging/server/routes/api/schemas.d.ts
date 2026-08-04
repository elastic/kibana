import type { TypeOf } from '@kbn/config-schema';
export declare const tagsSearchRequestQuerySchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    query: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const tagIdParamSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const tagAttributesSchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    color: import("@kbn/config-schema").Type<string>;
}>;
export declare const tagRequestAttributesSchema: import("@kbn/config-schema").ObjectType<{
    color: import("@kbn/config-schema").Type<string | undefined>;
    name: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const tagResponseItemSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    data: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        color: import("@kbn/config-schema").Type<string>;
    }>;
    meta: import("@kbn/config-schema").ObjectType<{
        created_at: import("@kbn/config-schema").Type<string | undefined>;
        created_by: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
        owner: import("@kbn/config-schema").Type<string | undefined>;
        updated_at: import("@kbn/config-schema").Type<string | undefined>;
        updated_by: import("@kbn/config-schema").Type<string | undefined>;
        version: import("@kbn/config-schema").Type<string | undefined>;
    }>;
}>;
export declare const tagsSearchResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    data: import("@kbn/config-schema").Type<Readonly<{} & {
        meta: Readonly<{
            version?: string | undefined;
            managed?: boolean | undefined;
            created_at?: string | undefined;
            created_by?: string | undefined;
            updated_at?: string | undefined;
            updated_by?: string | undefined;
            owner?: string | undefined;
        } & {}>;
        id: string;
        data: Readonly<{
            description?: string | undefined;
        } & {
            color: string;
            name: string;
        }>;
    }>[]>;
    meta: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<number>;
        per_page: import("@kbn/config-schema").Type<number>;
        total: import("@kbn/config-schema").Type<number>;
    }>;
}>;
export type TagResponseItem = TypeOf<typeof tagResponseItemSchema>;
export type TagsSearchResponseBody = TypeOf<typeof tagsSearchResponseBodySchema>;
export type TagsSearchRequestQuery = TypeOf<typeof tagsSearchRequestQuerySchema>;
