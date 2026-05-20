import type { EsqlResponse } from './execute_esql';
/**
 * Converts an ES|QL /_query columnar response to a JSON representation
 */
export declare const esqlResponseToJson: (esql: EsqlResponse) => Array<Record<string, any>>;
export declare const extractEsqlQueries: (message: string) => string[];
