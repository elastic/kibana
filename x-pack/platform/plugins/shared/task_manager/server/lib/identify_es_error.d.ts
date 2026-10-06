export interface ESErrorCausedBy {
    type?: string;
    reason?: string;
    caused_by?: ESErrorCausedBy;
}
export interface ESError {
    root_cause?: ESErrorCausedBy[];
    caused_by?: ESErrorCausedBy;
}
export interface ESErrorBody {
    error?: ESError;
    status?: number;
}
export interface ESErrorMeta {
    body?: ESErrorBody;
    statusCode?: number;
}
export interface ElasticsearchResponseError {
    name?: string;
    meta?: ESErrorMeta;
}
/**
 * Identified causes for ES Error
 *
 * @param err Object Error thrown by ES JS client
 * @return ES error cause
 */
export declare function identifyEsError(err: ElasticsearchResponseError): string[];
export declare function isEsCannotExecuteScriptError(err: ElasticsearchResponseError): boolean;
