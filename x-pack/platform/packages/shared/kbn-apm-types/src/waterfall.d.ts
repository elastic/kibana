export declare enum WaterfallLegendType {
    ServiceName = "serviceName",
    Type = "type"
}
export interface IWaterfallLegend {
    type: WaterfallLegendType;
    value: string | undefined;
    color: string;
}
export type IWaterfallGetRelatedErrorsHref = (docId: string) => string;
export type WaterfallGetServiceBadgeHref = (serviceName: string) => string;
export type WaterfallGetErrorMarkerHref = (params: {
    serviceName: string;
    errorGroupId: string;
    traceId?: string;
    transactionId?: string;
}) => string;
