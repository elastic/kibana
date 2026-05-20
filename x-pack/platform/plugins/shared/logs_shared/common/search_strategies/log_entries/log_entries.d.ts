import type { estypes } from '@elastic/elasticsearch';
import * as rt from 'io-ts';
export declare const LOG_ENTRIES_SEARCH_STRATEGY = "infra-log-entries";
export declare const logEntriesBeforeSearchRequestParamsRT: rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
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
    startTimestamp: rt.NumberC;
    endTimestamp: rt.NumberC;
    size: rt.NumberC;
}>, rt.PartialC<{
    query: rt.Type<import("@kbn/utility-types/src/serializable").JsonObject, import("@kbn/utility-types/src/serializable").JsonObject, unknown>;
    columns: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
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
    highlightPhrase: rt.StringC;
}>]>, rt.TypeC<{
    before: rt.UnionC<[rt.TypeC<{
        time: rt.StringC;
        tiebreaker: rt.NumberC;
    }>, rt.LiteralC<"last">]>;
}>]>;
export declare const logEntriesAfterSearchRequestParamsRT: rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
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
    startTimestamp: rt.NumberC;
    endTimestamp: rt.NumberC;
    size: rt.NumberC;
}>, rt.PartialC<{
    query: rt.Type<import("@kbn/utility-types/src/serializable").JsonObject, import("@kbn/utility-types/src/serializable").JsonObject, unknown>;
    columns: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
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
    highlightPhrase: rt.StringC;
}>]>, rt.TypeC<{
    after: rt.UnionC<[rt.TypeC<{
        time: rt.StringC;
        tiebreaker: rt.NumberC;
    }>, rt.LiteralC<"first">]>;
}>]>;
export declare const logEntriesSearchRequestParamsRT: rt.UnionC<[rt.IntersectionC<[rt.TypeC<{
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
    startTimestamp: rt.NumberC;
    endTimestamp: rt.NumberC;
    size: rt.NumberC;
}>, rt.PartialC<{
    query: rt.Type<import("@kbn/utility-types/src/serializable").JsonObject, import("@kbn/utility-types/src/serializable").JsonObject, unknown>;
    columns: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
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
    highlightPhrase: rt.StringC;
}>]>, rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
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
    startTimestamp: rt.NumberC;
    endTimestamp: rt.NumberC;
    size: rt.NumberC;
}>, rt.PartialC<{
    query: rt.Type<import("@kbn/utility-types/src/serializable").JsonObject, import("@kbn/utility-types/src/serializable").JsonObject, unknown>;
    columns: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
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
    highlightPhrase: rt.StringC;
}>]>, rt.TypeC<{
    before: rt.UnionC<[rt.TypeC<{
        time: rt.StringC;
        tiebreaker: rt.NumberC;
    }>, rt.LiteralC<"last">]>;
}>]>, rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
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
    startTimestamp: rt.NumberC;
    endTimestamp: rt.NumberC;
    size: rt.NumberC;
}>, rt.PartialC<{
    query: rt.Type<import("@kbn/utility-types/src/serializable").JsonObject, import("@kbn/utility-types/src/serializable").JsonObject, unknown>;
    columns: rt.ArrayC<rt.UnionC<[rt.ExactC<rt.TypeC<{
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
    highlightPhrase: rt.StringC;
}>]>, rt.TypeC<{
    after: rt.UnionC<[rt.TypeC<{
        time: rt.StringC;
        tiebreaker: rt.NumberC;
    }>, rt.LiteralC<"first">]>;
}>]>]>;
export type LogEntriesSearchRequestParams = rt.TypeOf<typeof logEntriesSearchRequestParamsRT>;
export type LogEntriesSearchRequestQuery = estypes.QueryDslQueryContainer;
export declare const logEntriesSearchResponsePayloadRT: rt.IntersectionC<[rt.TypeC<{
    data: rt.IntersectionC<[rt.TypeC<{
        entries: rt.ArrayC<rt.TypeC<{
            id: rt.StringC;
            index: rt.StringC;
            cursor: rt.TypeC<{
                time: rt.StringC;
                tiebreaker: rt.NumberC;
            }>;
            columns: rt.ArrayC<rt.UnionC<[rt.TypeC<{
                columnId: rt.StringC;
                time: rt.StringC;
            }>, rt.TypeC<{
                columnId: rt.StringC;
                field: rt.StringC;
                value: rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>;
                highlights: rt.ArrayC<rt.StringC>;
            }>, rt.TypeC<{
                columnId: rt.StringC;
                message: rt.ArrayC<rt.UnionC<[rt.TypeC<{
                    constant: rt.StringC;
                }>, rt.TypeC<{
                    field: rt.StringC;
                    value: rt.Type<import("@kbn/utility-types/src/serializable").JsonArray, import("@kbn/utility-types/src/serializable").JsonArray, unknown>;
                    highlights: rt.ArrayC<rt.StringC>;
                }>]>>;
            }>]>>;
            context: rt.UnionC<[rt.TypeC<{}>, rt.TypeC<{
                'container.id': rt.StringC;
            }>, rt.TypeC<{
                'host.name': rt.StringC;
                'log.file.path': rt.StringC;
            }>]>;
        }>>;
        topCursor: rt.UnionC<[rt.TypeC<{
            time: rt.StringC;
            tiebreaker: rt.NumberC;
        }>, rt.NullC]>;
        bottomCursor: rt.UnionC<[rt.TypeC<{
            time: rt.StringC;
            tiebreaker: rt.NumberC;
        }>, rt.NullC]>;
    }>, rt.PartialC<{
        hasMoreBefore: rt.BooleanC;
        hasMoreAfter: rt.BooleanC;
    }>]>;
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
export type LogEntriesSearchResponsePayload = rt.TypeOf<typeof logEntriesSearchResponsePayloadRT>;
