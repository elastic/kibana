import type { Type, TypeOf } from '@kbn/config-schema';
export declare const dataViewSpecSchema: import("@kbn/config-schema").ObjectType<{
    title: Type<string>;
    version: Type<string | undefined>;
    id: Type<string | undefined>;
    type: Type<string | undefined>;
    timeFieldName: Type<string | undefined>;
    sourceFilters: Type<Readonly<{
        clientId?: string | number | undefined;
    } & {
        value: string;
    }>[] | undefined>;
    fields: Type<Record<string, Readonly<{
        count?: number | undefined;
        script?: string | undefined;
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        esTypes?: string[] | undefined;
        scripted?: boolean | undefined;
        subType?: Readonly<{
            multi?: Readonly<{} & {
                parent: string;
            }> | undefined;
            nested?: Readonly<{} & {
                path: string;
            }> | undefined;
        } & {}> | undefined;
        customLabel?: string | undefined;
        customDescription?: string | undefined;
        shortDotsEnable?: boolean | undefined;
        searchable?: boolean | undefined;
        aggregatable?: boolean | undefined;
        readFromDocValues?: boolean | undefined;
        runtimeField?: Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "composite" | "date" | "double" | "geo_point" | "ip" | "keyword" | "long";
        }> | Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            fields?: Record<string, Readonly<{
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "composite" | "date" | "double" | "geo_point" | "ip" | "keyword" | "long";
            }>> | undefined;
        } & {
            type: "boolean" | "composite" | "date" | "double" | "geo_point" | "ip" | "keyword" | "long";
        }> | undefined;
    } & {
        name: string;
        type: string;
    }>> | undefined>;
    typeMeta: Type<Readonly<{} & {}> | undefined>;
    fieldFormats: Type<Record<string, Readonly<{
        id?: string | undefined;
        params?: any;
    } & {}>> | undefined>;
    fieldAttrs: Type<Record<string, Readonly<{
        customLabel?: string | undefined;
        customDescription?: string | undefined;
        count?: number | undefined;
    } & {}>> | undefined>;
    allowNoIndex: Type<boolean | undefined>;
    runtimeFieldMap: Type<Record<string, Readonly<{
        script?: Readonly<{} & {
            source: string;
        }> | undefined;
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        customLabel?: string | undefined;
        customDescription?: string | undefined;
        popularity?: number | undefined;
    } & {
        type: "boolean" | "composite" | "date" | "double" | "geo_point" | "ip" | "keyword" | "long";
    }> | Readonly<{
        script?: Readonly<{} & {
            source: string;
        }> | undefined;
        fields?: Record<string, Readonly<{
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "composite" | "date" | "double" | "geo_point" | "ip" | "keyword" | "long";
        }>> | undefined;
    } & {
        type: "boolean" | "composite" | "date" | "double" | "geo_point" | "ip" | "keyword" | "long";
    }>> | undefined>;
    name: Type<string | undefined>;
    namespaces: Type<string[] | undefined>;
    allowHidden: Type<boolean | undefined>;
    managed: Type<boolean | undefined>;
}>;
export type DataViewSpec = TypeOf<typeof dataViewSpecSchema>;
