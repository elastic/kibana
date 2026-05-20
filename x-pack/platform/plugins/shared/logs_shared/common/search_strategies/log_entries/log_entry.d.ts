import * as rt from 'io-ts';
export declare const LOG_ENTRY_SEARCH_STRATEGY = "infra-log-entry";
export declare const logEntrySearchRequestParamsRT: rt.TypeC<{
    logView: rt.UnionC<[rt.TypeC<{
        logViewId: rt.StringC;
        type: rt.LiteralC<"log-view-reference">;
    }>, rt.TypeC<{
        type: rt.LiteralC<"log-view-inline">;
        id: rt.StringC;
        attributes: rt.ExactC<rt.TypeC<{
            name: rt.StringC;
            description: rt.StringC;
            logIndices: rt.UnionC<[rt.TypeC<{
                type: rt.LiteralC<"data_view">;
                dataViewId: rt.StringC;
            }>, rt.TypeC<{
                type: rt.LiteralC<"index_name">;
                indexName: rt.StringC;
            }>, rt.TypeC<{
                type: rt.LiteralC<"kibana_advanced_setting">;
            }>]>;
            logColumns: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
                timestampColumn: rt.ExactC<rt.TypeC<{
                    id: rt.StringC;
                }>>;
            }>>, rt.ExactC<rt.TypeC<{
                messageColumn: rt.ExactC<rt.TypeC<{
                    id: rt.StringC;
                }>>;
            }>>, rt.ExactC<rt.TypeC<{
                fieldColumn: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
                    id: rt.StringC;
                }>>, rt.ExactC<rt.TypeC<{
                    field: rt.StringC;
                }>>]>;
            }>>]>>;
        }>>;
    }>]>;
    logEntryId: rt.StringC;
}>;
export type LogEntrySearchRequestParams = rt.TypeOf<typeof logEntrySearchRequestParamsRT>;
export declare const logEntryRT: rt.TypeC<{
    id: rt.StringC;
    index: rt.StringC;
    fields: rt.ArrayC<rt.TypeC<{
        field: rt.StringC;
        value: rt.Type<import("@kbn/utility-types").JsonArray, import("@kbn/utility-types").JsonArray, unknown>;
    }>>;
    cursor: rt.TypeC<{
        time: rt.StringC;
        tiebreaker: rt.NumberC;
    }>;
}>;
export type LogEntry = rt.TypeOf<typeof logEntryRT>;
export declare const logEntrySearchResponsePayloadRT: rt.IntersectionC<[rt.TypeC<{
    data: rt.UnionC<[rt.TypeC<{
        id: rt.StringC;
        index: rt.StringC;
        fields: rt.ArrayC<rt.TypeC<{
            field: rt.StringC;
            value: rt.Type<import("@kbn/utility-types").JsonArray, import("@kbn/utility-types").JsonArray, unknown>;
        }>>;
        cursor: rt.TypeC<{
            time: rt.StringC;
            tiebreaker: rt.NumberC;
        }>;
    }>, rt.NullC]>;
}>, rt.PartialC<{
    errors: rt.ArrayC<rt.UnionC<[rt.TypeC<{
        type: rt.LiteralC<"aborted">;
    }>, rt.TypeC<{
        type: rt.LiteralC<"generic">;
        message: rt.StringC;
    }>, rt.TypeC<{
        type: rt.LiteralC<"shardFailure">;
        shardInfo: rt.TypeC<{
            shard: rt.UnionC<[rt.NumberC, rt.NullC]>;
            index: rt.UnionC<[rt.StringC, rt.NullC]>;
            node: rt.UnionC<[rt.StringC, rt.NullC]>;
        }>;
        message: rt.UnionC<[rt.StringC, rt.NullC]>;
    }>]>>;
}>]>;
export type LogEntrySearchResponsePayload = rt.TypeOf<typeof logEntrySearchResponsePayloadRT>;
