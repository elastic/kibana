export type LogsSourceOption = 'file' | 'index';
export interface IntegrationFields {
    title: string;
    description: string;
    logo?: string;
    connectorId: string;
}
export interface DataStreamFields {
    dataStreamTitle: string;
    dataStreamDescription: string;
    dataCollectionMethod: string[];
    logsSourceOption: LogsSourceOption;
    logSample: string | undefined;
    selectedIndex: string;
}
export interface IntegrationFormData extends IntegrationFields, DataStreamFields {
    /**
     * If set, indicates we're adding a data stream to an existing integration.
     * If undefined, we're creating a new integration.
     */
    integrationId?: string;
}
