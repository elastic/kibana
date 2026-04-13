import type { TimeState } from '@kbn/es-query';
import type { AbortableAsyncState } from '@kbn/react-hooks';
interface StreamsAppFetchOptions {
    withTimeRange?: boolean;
    withRefresh?: boolean;
    disableToastOnError?: boolean;
}
interface DefaultStreamsAppFetchOptions {
    withTimeRange: false;
    withRefresh: false;
    disableToastOnError: false;
}
type ParametersFromOptions<TOptions extends StreamsAppFetchOptions | undefined> = {
    signal: AbortSignal;
} & (TOptions extends {
    withTimeRange: true;
} ? {
    timeState: TimeState;
} : {});
export declare function useStreamsAppFetch<T, TOptions extends StreamsAppFetchOptions | undefined = DefaultStreamsAppFetchOptions>(callback: ({}: ParametersFromOptions<TOptions>) => T, deps: any[], options?: TOptions): AbortableAsyncState<T>;
export {};
