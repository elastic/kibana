export declare const extractLogViewSavedObjectReferences: (savedObjectAttributes: {
    name: string;
    description: string;
    logIndices: {
        type: "data_view";
        dataViewId: string;
    } | {
        type: "index_name";
        indexName: string;
    } | {
        type: "kibana_advanced_setting";
    };
    logColumns: ({
        timestampColumn: {
            id: string;
        };
    } | {
        messageColumn: {
            id: string;
        };
    } | {
        fieldColumn: {
            id: string;
        } & {
            field: string;
        };
    })[];
}) => import("../../references").SavedObjectAttributesWithReferences<{
    name: string;
    description: string;
    logIndices: {
        type: "data_view";
        dataViewId: string;
    } | {
        type: "index_name";
        indexName: string;
    } | {
        type: "kibana_advanced_setting";
    };
    logColumns: ({
        timestampColumn: {
            id: string;
        };
    } | {
        messageColumn: {
            id: string;
        };
    } | {
        fieldColumn: {
            id: string;
        } & {
            field: string;
        };
    })[];
}>;
export declare const resolveLogViewSavedObjectReferences: (attributes: {
    name: string;
    description: string;
    logIndices: {
        type: "data_view";
        dataViewId: string;
    } | {
        type: "index_name";
        indexName: string;
    } | {
        type: "kibana_advanced_setting";
    };
    logColumns: ({
        timestampColumn: {
            id: string;
        };
    } | {
        messageColumn: {
            id: string;
        };
    } | {
        fieldColumn: {
            id: string;
        } & {
            field: string;
        };
    })[];
}, references: import("@kbn/core/server").SavedObjectReference[]) => {
    name: string;
    description: string;
    logIndices: {
        type: "data_view";
        dataViewId: string;
    } | {
        type: "index_name";
        indexName: string;
    } | {
        type: "kibana_advanced_setting";
    };
    logColumns: ({
        timestampColumn: {
            id: string;
        };
    } | {
        messageColumn: {
            id: string;
        };
    } | {
        fieldColumn: {
            id: string;
        } & {
            field: string;
        };
    })[];
};
