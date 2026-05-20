import type { ESQLSearchResponse } from '@kbn/es-types';
/**
 * Converts an ES|QL tabular response into plain row objects keyed by column name.
 *
 * Pass a generic type parameter to get typed rows instead of `Record<string, unknown>`.
 */
export declare const esqlResponseToObjectRows: <T extends object = Record<string, unknown>>(response: ESQLSearchResponse) => T[];
