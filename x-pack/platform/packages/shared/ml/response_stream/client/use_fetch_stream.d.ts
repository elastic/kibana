import { type Reducer, type ReducerState, type ReducerAction } from 'react';
import type { HttpSetup, HttpFetchOptions } from '@kbn/core/public';
import { type StringReducer } from './string_reducer';
type CustomReducer<T> = T extends StringReducer ? StringReducer : T extends Reducer<any, any> ? T : never;
interface FetchStreamCustomReducer<T> {
    reducer: CustomReducer<T>;
    initialState: ReducerState<CustomReducer<T>>;
}
/**
 * Custom hook to receive streaming data.
 *
 * Note on the use of `any`:
 * The generic `R` extends from `Reducer<any, any>`
 * to match the definition in React itself.
 *
 * @param http Kibana HTTP client.
 * @param endpoint API endpoint including Kibana base path.
 * @param apiVersion Optional API version.
 * @param body Optional API request body.
 * @param customReducer Optional custom reducer and initial state.
 * @param headers Optional headers.
 * @returns An object with streaming data and methods to act on the stream.
 */
export declare function useFetchStream<B extends object, R extends Reducer<any, any>>(http: HttpSetup, endpoint: string, apiVersion?: string, body?: B, customReducer?: FetchStreamCustomReducer<R>, headers?: HttpFetchOptions['headers']): {
    cancel: () => void;
    data: ReducerState<CustomReducer<R>>;
    dispatch: (action: ReducerAction<FetchStreamCustomReducer<R>["reducer"]>) => void;
    errors: string[];
    isCancelled: boolean;
    isRunning: boolean;
    start: () => Promise<void>;
};
export {};
