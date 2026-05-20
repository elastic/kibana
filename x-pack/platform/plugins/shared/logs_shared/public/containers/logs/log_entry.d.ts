import type { LogViewReference } from '../../../common/log_views';
export declare const useLogEntry: ({ logViewReference, logEntryId, }: {
    logViewReference: LogViewReference | null | undefined;
    logEntryId: string | null | undefined;
}) => {
    cancelRequest: () => void;
    errors: ({
        type: "aborted";
    } | {
        type: "generic";
        message: string;
    } | {
        type: "shardFailure";
        shardInfo: {
            shard: number | null;
            index: string | null;
            node: string | null;
        };
        message: string | null;
    })[] | undefined;
    fetchLogEntry: () => {
        abortController: AbortController;
        response$: import("rxjs").Observable<import("../../utils/data_search").ParsedKibanaSearchResponse<{
            id: string;
            index: string;
            fields: {
                field: string;
                value: import("@kbn/utility-types").JsonArray;
            }[];
            cursor: {
                time: string;
                tiebreaker: number;
            };
        } | null>>;
        request: {
            params: {
                logView: {
                    logViewId: string;
                    type: "log-view-reference";
                } | {
                    type: "log-view-inline";
                    id: string;
                    attributes: {
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
                };
                logEntryId: string;
            };
        };
        options: import("@kbn/search-types").ISearchOptions;
    } | undefined;
    isRequestRunning: boolean;
    isResponsePartial: boolean;
    loaded: number | undefined;
    logEntry: {
        id: string;
        index: string;
        fields: {
            field: string;
            value: import("@kbn/utility-types").JsonArray;
        }[];
        cursor: {
            time: string;
            tiebreaker: number;
        };
    } | null;
    total: number | undefined;
};
