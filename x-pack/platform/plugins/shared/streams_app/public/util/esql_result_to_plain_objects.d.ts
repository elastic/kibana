import type { ESQLSearchResponse } from '@kbn/es-types';
export declare function esqlResultToPlainObjects<TDocument extends Record<string, unknown> = Record<string, unknown>>(result: ESQLSearchResponse): TDocument[];
