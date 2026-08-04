import type { WaterfallGetErrorMarkerHref } from './waterfall';
type FullTraceWaterfallScrollProps = {
    scrollStrategy?: 'window';
    contextSpanIds?: string[];
} | {
    scrollStrategy: 'parent';
    contextSpanIds?: string[];
    scrollToContextOnMount?: boolean;
};
export type FullTraceWaterfallProps = {
    traceId: string;
    rangeFrom: string;
    rangeTo: string;
    serviceName?: string;
    scrollElement?: Element;
    onNodeClick?: (nodeSpanId: string) => void;
    onErrorClick?: FullTraceWaterfallOnErrorClick;
    getErrorMarkerHref?: WaterfallGetErrorMarkerHref;
    ebt: {
        row: {
            element: string;
        };
        errorBadge: {
            element: string;
        };
        serviceBadge: {
            element: string;
        };
    };
} & FullTraceWaterfallScrollProps;
export type FullTraceWaterfallOnErrorClick = (params: {
    traceId: string;
    docId: string;
    errorCount: number;
    errorDocId?: string;
    docIndex?: string;
}) => void;
export {};
