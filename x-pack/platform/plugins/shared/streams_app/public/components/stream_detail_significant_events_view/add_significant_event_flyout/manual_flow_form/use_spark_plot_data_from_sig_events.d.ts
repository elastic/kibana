import type { AbortableAsyncState } from '@kbn/react-hooks';
import type { SignificantEventsPreviewResponse, StreamQuery } from '@kbn/streams-schema';
import type { TickFormatter } from '@elastic/charts';
export declare function useSparkplotDataFromSigEvents({ previewFetch, query, xFormatter, }: {
    previewFetch: AbortableAsyncState<Promise<SignificantEventsPreviewResponse>>;
    query: StreamQuery;
    xFormatter: TickFormatter;
}): {
    timeseries: {
        x: number;
        y: number;
    }[];
    annotations: {
        color: string;
        icon: import("react").JSX.Element;
        id: string;
        label: import("react").JSX.Element;
        x: number;
    }[];
};
