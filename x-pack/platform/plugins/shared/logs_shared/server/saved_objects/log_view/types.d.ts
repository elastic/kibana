import * as rt from 'io-ts';
export declare const logDataViewSavedObjectReferenceRT: rt.TypeC<{
    type: rt.LiteralC<"data_view">;
    dataViewId: rt.StringC;
}>;
export declare const logIndexNameSavedObjectReferenceRT: rt.TypeC<{
    type: rt.LiteralC<"index_name">;
    indexName: rt.StringC;
}>;
export declare const logSourcesKibanaAdvancedSettingSavedObjectRT: rt.TypeC<{
    type: rt.LiteralC<"kibana_advanced_setting">;
}>;
export declare const logIndexSavedObjectReferenceRT: rt.UnionC<[rt.TypeC<{
    type: rt.LiteralC<"data_view">;
    dataViewId: rt.StringC;
}>, rt.TypeC<{
    type: rt.LiteralC<"index_name">;
    indexName: rt.StringC;
}>, rt.TypeC<{
    type: rt.LiteralC<"kibana_advanced_setting">;
}>]>;
export declare const logViewSavedObjectFieldColumnConfigurationRT: rt.ExactC<rt.TypeC<{
    fieldColumn: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        field: rt.StringC;
    }>>]>;
}>>;
export declare const logViewSavedObjectColumnConfigurationRT: rt.UnionC<[rt.ExactC<rt.TypeC<{
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
}>>]>;
export declare const logViewSavedObjectAttributesRT: rt.ExactC<rt.TypeC<{
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
export type LogViewSavedObjectAttributes = rt.TypeOf<typeof logViewSavedObjectAttributesRT>;
export declare const logViewSavedObjectRT: rt.IntersectionC<[rt.TypeC<{
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
    references: rt.ArrayC<rt.ExactC<rt.TypeC<{
        name: rt.StringC;
        type: rt.StringC;
        id: rt.StringC;
    }>>>;
}>, rt.PartialC<{
    version: rt.StringC;
    updated_at: rt.Type<number, string, unknown>;
}>]>;
