import type { JsonObject } from '@kbn/utility-types';
/**
 * Stringifies JSON, preserving number format from original string when available.
 * Falls back to standard JSON.stringify for new or modified objects.
 */
export declare const stringifyJson: (json: any, renderAsArray?: boolean) => string;
/**
 * Parses JSON string and stores the original string for format preservation.
 * This allows stringifyJson to maintain trailing zeros in numeric values.
 */
export declare function parseJson(jsonString: string, renderAsArray?: true): JsonObject[];
export declare function parseJson(jsonString: string, renderAsArray: false): JsonObject;
