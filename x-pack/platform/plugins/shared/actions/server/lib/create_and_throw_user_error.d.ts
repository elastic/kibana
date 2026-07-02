import type { AxiosError } from 'axios';
export declare const httpResponseUserErrorCodes: number[];
/**
 * Categorizes errored actions HTTP requests against external systems, creating user errors based
 * on the status code of the response and any overrides provided.
 */
export declare const createAndThrowUserError: <T = unknown, D = unknown>(error: AxiosError<T, D>) => void;
