import * as rt from 'io-ts';
export interface DefaultLogViewsStaticConfig {
    messageFields: string[];
}
export type LogViewsStaticConfig = Partial<DefaultLogViewsStaticConfig>;
export declare const logViewOriginRT: rt.KeyofC<{
    stored: null;
    internal: null;
    inline: null;
    'infra-source-stored': null;
    'infra-source-internal': null;
    'infra-source-fallback': null;
}>;
export type LogViewOrigin = rt.TypeOf<typeof logViewOriginRT>;
export declare const logDataViewReferenceRT: rt.TypeC<{
    type: rt.LiteralC<"data_view">;
    dataViewId: rt.StringC;
}>;
export type LogDataViewReference = rt.TypeOf<typeof logDataViewReferenceRT>;
export declare const logIndexNameReferenceRT: rt.TypeC<{
    type: rt.LiteralC<"index_name">;
    indexName: rt.StringC;
}>;
export type LogIndexNameReference = rt.TypeOf<typeof logIndexNameReferenceRT>;
export declare const logSourcesKibanaAdvancedSettingRT: rt.TypeC<{
    type: rt.LiteralC<"kibana_advanced_setting">;
}>;
export type LogSourcesKibanaAdvancedSettingReference = rt.TypeOf<typeof logSourcesKibanaAdvancedSettingRT>;
export declare const logIndexReferenceRT: rt.UnionC<[rt.TypeC<{
    type: rt.LiteralC<"data_view">;
    dataViewId: rt.StringC;
}>, rt.TypeC<{
    type: rt.LiteralC<"index_name">;
    indexName: rt.StringC;
}>, rt.TypeC<{
    type: rt.LiteralC<"kibana_advanced_setting">;
}>]>;
export type LogIndexReference = rt.TypeOf<typeof logIndexReferenceRT>;
export declare const logViewFieldColumnConfigurationRT: rt.ExactC<rt.TypeC<{
    fieldColumn: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        id: rt.StringC;
    }>>, rt.ExactC<rt.TypeC<{
        field: rt.StringC;
    }>>]>;
}>>;
export declare const logViewColumnConfigurationRT: rt.UnionC<[rt.ExactC<rt.TypeC<{
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
export type LogViewColumnConfiguration = rt.TypeOf<typeof logViewColumnConfigurationRT>;
export declare const logViewAttributesRT: rt.ExactC<rt.TypeC<{
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
export type LogViewAttributes = rt.TypeOf<typeof logViewAttributesRT>;
export declare const logViewRT: rt.ExactC<rt.IntersectionC<[rt.TypeC<{
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
export type LogView = rt.TypeOf<typeof logViewRT>;
export declare const logViewIndexStatusRT: rt.KeyofC<{
    available: null;
    empty: null;
    missing: null;
    unknown: null;
}>;
export type LogViewIndexStatus = rt.TypeOf<typeof logViewIndexStatusRT>;
export declare const logViewStatusRT: rt.ExactC<rt.TypeC<{
    index: rt.KeyofC<{
        available: null;
        empty: null;
        missing: null;
        unknown: null;
    }>;
}>>;
export type LogViewStatus = rt.TypeOf<typeof logViewStatusRT>;
export declare const persistedLogViewReferenceRT: rt.TypeC<{
    logViewId: rt.StringC;
    type: rt.LiteralC<"log-view-reference">;
}>;
export type PersistedLogViewReference = rt.TypeOf<typeof persistedLogViewReferenceRT>;
export declare const inlineLogViewReferenceRT: rt.TypeC<{
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
}>;
export declare const logViewReferenceRT: rt.UnionC<[rt.TypeC<{
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
export type LogViewReference = rt.TypeOf<typeof logViewReferenceRT>;
