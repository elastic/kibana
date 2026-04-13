import type { AbortableAsyncState } from '@kbn/react-hooks';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { AsyncState } from 'react-use/lib/useAsync';
interface Timeseries<T extends string> {
    id: string;
    label: string;
    metricNames: T[];
    data: Array<{
        x: number;
    } & Record<T, number | null>>;
}
export declare function esqlResultToTimeseries<T extends string>({ result, metricNames, }: {
    result: AsyncState<ESQLSearchResponse> | AbortableAsyncState<ESQLSearchResponse>;
    metricNames: T[];
}): Array<Timeseries<T>>;
export {};
