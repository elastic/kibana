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
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        customLabel?: string | undefined;
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
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
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
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }>> | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | undefined;
        count?: number | undefined;
        customDescription?: string | undefined;
        searchable?: boolean | undefined;
        aggregatable?: boolean | undefined;
        readFromDocValues?: boolean | undefined;
        shortDotsEnable?: boolean | undefined;
    } & {
        type: string;
        name: string;
    }>> | undefined>;
    typeMeta: Type<Readonly<{} & {}> | undefined>;
    fieldFormats: Type<Record<string, Readonly<{
        id?: string | undefined;
        params?: any;
    } & {}>> | undefined>;
    fieldAttrs: Type<Record<string, Readonly<{
        customLabel?: string | undefined;
        count?: number | undefined;
        customDescription?: string | undefined;
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
        type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
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
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }>> | undefined;
    } & {
        type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
    }>> | undefined>;
    name: Type<string | undefined>;
    namespaces: Type<string[] | undefined>;
    allowHidden: Type<boolean | undefined>;
    managed: Type<boolean | undefined>;
}>;
export type DataViewSpec = TypeOf<typeof dataViewSpecSchema>;
