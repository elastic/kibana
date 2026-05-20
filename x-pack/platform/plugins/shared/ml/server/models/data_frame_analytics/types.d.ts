import type { JobMapNodeTypes, MapElements, AnalyticsMapNodeElement, AnalyticsMapEdgeElement } from '@kbn/ml-data-frame-analytics-utils';
interface AnalyticsMapArg {
    analyticsId: string;
}
export interface GetAnalyticsJobIdArg extends AnalyticsMapArg {
    modelId?: never;
}
export interface GetAnalyticsModelIdArg {
    analyticsId?: never;
    modelId: string;
}
interface ExtendAnalyticsJobIdArg extends AnalyticsMapArg {
    index?: never;
}
interface ExtendAnalyticsIndexArg {
    analyticsId?: never;
    index: string;
}
export type GetAnalyticsMapArgs = GetAnalyticsJobIdArg | GetAnalyticsModelIdArg;
export type ExtendAnalyticsMapArgs = ExtendAnalyticsJobIdArg | ExtendAnalyticsIndexArg;
export interface IndexPatternLinkReturnType {
    isWildcardIndexPattern: boolean;
    isIndexPattern: boolean;
    indexData: any;
    meta: any;
}
export interface JobDataLinkReturnType {
    isJob: boolean;
    jobData: any;
}
export interface TransformLinkReturnType {
    isTransform: boolean;
    transformData: any;
}
export type NextLinkReturnType = IndexPatternLinkReturnType | JobDataLinkReturnType | TransformLinkReturnType | undefined;
interface BasicInitialElementsReturnType {
    data: any;
    details: object;
    resultElements: MapElements[];
    modelElements: MapElements[];
}
export interface InitialElementsReturnType extends BasicInitialElementsReturnType {
    nextLinkId?: string;
    nextType?: JobMapNodeTypes;
    previousNodeId?: string;
}
interface CompleteInitialElementsReturnType extends BasicInitialElementsReturnType {
    nextLinkId: string;
    nextType: JobMapNodeTypes;
    previousNodeId: string;
}
export declare const isCompleteInitialReturnType: (arg: any) => arg is CompleteInitialElementsReturnType;
export declare const isAnalyticsMapNodeElement: (arg: any) => arg is AnalyticsMapNodeElement;
export declare const isAnalyticsMapEdgeElement: (arg: any) => arg is AnalyticsMapEdgeElement;
export declare const isIndexPatternLinkReturnType: (arg: any) => arg is IndexPatternLinkReturnType;
export declare const isJobDataLinkReturnType: (arg: any) => arg is JobDataLinkReturnType;
export declare const isTransformLinkReturnType: (arg: any) => arg is TransformLinkReturnType;
export {};
