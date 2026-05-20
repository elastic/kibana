export declare const AlertHistoryDefaultIndexName = "kibana-alert-history-default";
export declare const AlertHistoryEsIndexConnectorId = "preconfigured-alert-history-es-index";
export declare const buildAlertHistoryDocument: (variables: Record<string, unknown>) => {
    event: {
        kind: string;
    };
    kibana?: {
        alert: {
            actionGroupName?: string | undefined;
            actionGroup?: string | undefined;
            context?: {
                [x: string]: Record<string, unknown>;
            } | undefined;
            id?: string | undefined;
        };
    } | undefined;
    rule?: {
        type?: string | undefined;
        space?: string | undefined;
        params?: {
            [x: string]: Record<string, unknown>;
        } | undefined;
        name?: string | undefined;
        id?: string | undefined;
    } | undefined;
    message?: {} | undefined;
    tags?: string[] | undefined;
    '@timestamp': string;
} | null;
export declare const AlertHistoryDocumentTemplate: Readonly<{
    event: {
        kind: string;
    };
    kibana?: {
        alert: {
            actionGroupName?: string | undefined;
            actionGroup?: string | undefined;
            context?: {
                [x: string]: Record<string, unknown>;
            } | undefined;
            id?: string | undefined;
        };
    } | undefined;
    rule?: {
        type?: string | undefined;
        space?: string | undefined;
        params?: {
            [x: string]: Record<string, unknown>;
        } | undefined;
        name?: string | undefined;
        id?: string | undefined;
    } | undefined;
    message?: {} | undefined;
    tags?: string[] | undefined;
    '@timestamp': string;
} | null>;
