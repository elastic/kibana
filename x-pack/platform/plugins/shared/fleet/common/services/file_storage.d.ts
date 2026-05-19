/**
 * Returns the index name for File Metadata storage for a given integration
 * @param integrationName
 * @param forHostDelivery
 */
export declare const getFileMetadataIndexName: (integrationName: string, 
/** if set to true, then the index returned will be for files that are being sent to the host */
forHostDelivery?: boolean) => string;
/**
 * Returns the index name for File data (chunks) storage for a given integration
 * @param integrationName
 */
export declare const getFileDataIndexName: (integrationName: string, 
/** if set to true, then the index returned will be for files that are being sent to the host */
forHostDelivery?: boolean) => string;
