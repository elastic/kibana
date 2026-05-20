export declare const FILE_STORAGE_METADATA_INDEX_PATTERN = ".fleet-fileds-fromhost-meta-*";
export declare const FILE_STORAGE_DATA_INDEX_PATTERN = ".fleet-fileds-fromhost-data-*";
export declare const FILE_STORAGE_TO_HOST_METADATA_INDEX_PATTERN = ".fleet-fileds-tohost-meta-*";
export declare const FILE_STORAGE_TO_HOST_DATA_INDEX_PATTERN = ".fleet-fileds-tohost-data-*";
export declare const FILE_STORAGE_INTEGRATION_INDEX_NAMES: Readonly<Record<string, Readonly<{
    /** name to be used for the index */
    name: string;
    /** If integration supports files sent from host to ES/Kibana */
    fromHost: boolean;
    /** If integration supports files to be sent to host from kibana */
    toHost: boolean;
}>>>;
export declare const FILE_STORAGE_INTEGRATION_NAMES: Readonly<string[]>;
