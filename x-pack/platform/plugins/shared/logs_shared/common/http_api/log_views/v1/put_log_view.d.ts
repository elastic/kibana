import * as rt from 'io-ts';
export declare const putLogViewRequestParamsRT: rt.TypeC<{
    logViewId: rt.StringC;
}>;
export declare const putLogViewRequestPayloadRT: rt.TypeC<{
    attributes: rt.PartialC<{
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
    }>;
}>;
export type PutLogViewRequestPayload = rt.TypeOf<typeof putLogViewRequestPayloadRT>;
export declare const putLogViewResponsePayloadRT: rt.TypeC<{
    data: rt.ExactC<rt.IntersectionC<[rt.TypeC<{
        id: rt.StringC;
        origin: rt.KeyofC<{
            stored: null;
            internal: null;
            inline: null;
            'infra-source-stored': null;
            'infra-source-internal': null;
            'infra-source-fallback': null;
        }>;
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
    }>, rt.PartialC<{
        updatedAt: rt.NumberC;
        version: rt.StringC;
    }>]>>;
}>;
