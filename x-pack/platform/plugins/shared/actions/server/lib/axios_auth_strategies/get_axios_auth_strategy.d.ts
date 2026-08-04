import type { AxiosAuthStrategy } from './types';
/**
 * Returns the AxiosAuthStrategy for the given auth type.
 * This is the single place where authTypeId is inspected for strategy selection,
 * which includes 401 handling and token request.
 */
export declare const getAxiosAuthStrategy: (authTypeId: string) => AxiosAuthStrategy;
