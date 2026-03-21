export interface FullTraceWaterfallProps {
    traceId: string;
    rangeFrom: string;
    rangeTo: string;
    serviceName?: string;
    scrollElement?: Element;
    onNodeClick?: (nodeSpanId: string) => void;
    onErrorClick?: FullTraceWaterfallOnErrorClick;
}
export type FullTraceWaterfallOnErrorClick = (params: {
    traceId: string;
    docId: string;
    errorCount: number;
    errorDocId?: string;
    docIndex?: string;
}) => void;
