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
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        script?: string | undefined;
        subType?: Readonly<{
            nested?: Readonly<{} & {
                path: string;
            }> | undefined;
            multi?: Readonly<{} & {
                parent: string;
            }> | undefined;
        } & {}> | undefined;
        scripted?: boolean | undefined;
        esTypes?: string[] | undefined;
        searchable?: boolean | undefined;
        customLabel?: string | undefined;
        runtimeField?: Readonly<{
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
        }> | Readonly<{
            fields?: Record<string, Readonly<{
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
            }>> | undefined;
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
        }> | undefined;
        customDescription?: string | undefined;
        aggregatable?: boolean | undefined;
        readFromDocValues?: boolean | undefined;
        shortDotsEnable?: boolean | undefined;
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
        count?: number | undefined;
        customLabel?: string | undefined;
        customDescription?: string | undefined;
    } & {}>> | undefined>;
    allowNoIndex: Type<boolean | undefined>;
    runtimeFieldMap: Type<Record<string, Readonly<{
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        script?: Readonly<{} & {
            source: string;
        }> | undefined;
        customLabel?: string | undefined;
        customDescription?: string | undefined;
        popularity?: number | undefined;
    } & {
        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
    }> | Readonly<{
        fields?: Record<string, Readonly<{
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
        }>> | undefined;
        script?: Readonly<{} & {
            source: string;
        }> | undefined;
    } & {
        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
    }>> | undefined>;
    name: Type<string | undefined>;
    namespaces: Type<string[] | undefined>;
    allowHidden: Type<boolean | undefined>;
    managed: Type<boolean | undefined>;
}>;
export type DataViewSpec = TypeOf<typeof dataViewSpecSchema>;
