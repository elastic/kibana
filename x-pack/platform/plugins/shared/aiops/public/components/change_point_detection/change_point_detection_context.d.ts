import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/public';
import { type Filter, type Query } from '@kbn/es-query';
import { type QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { TimeBuckets, TimeBucketsInterval } from '@kbn/ml-time-buckets';
import { type ChangePointType } from './constants';
export interface ChangePointDetectionPageUrlState {
    pageKey: 'changePoint';
    pageUrlState: ChangePointDetectionRequestParams;
}
export interface FieldConfig {
    fn: string;
    splitField?: string;
    metricField: string;
}
export interface ChangePointDetectionRequestParams {
    fieldConfigs: FieldConfig[];
    interval: string;
    query: Query;
    filters: Filter[];
    changePointType?: ChangePointType[];
}
export declare const ChangePointDetectionContext: React.Context<{
    timeBuckets: TimeBuckets;
    bucketInterval: TimeBucketsInterval;
    requestParams: ChangePointDetectionRequestParams;
    metricFieldOptions: DataViewField[];
    splitFieldsOptions: DataViewField[];
    updateRequestParams: (update: Partial<ChangePointDetectionRequestParams>) => void;
    resultFilters: Filter[];
    updateFilters: (update: Filter[]) => void;
    resultQuery: Query;
    combinedQuery: QueryDslQueryContainer;
    selectedChangePoints: Record<number, SelectedChangePoint[]>;
    setSelectedChangePoints: (update: Record<number, SelectedChangePoint[]>) => void;
}>;
export interface ChangePointAnnotation {
    id: string;
    label: string;
    reason?: string;
    timestamp?: string;
    group?: {
        name: string;
        value: string;
    };
    type: ChangePointType;
    p_value?: number;
}
export type SelectedChangePoint = FieldConfig & ChangePointAnnotation;
export declare const ChangePointDetectionControlsContext: React.Context<{
    metricFieldOptions: DataViewField[];
    splitFieldsOptions: DataViewField[];
}>;
export declare const useChangePointDetectionControlsContext: () => {
    metricFieldOptions: DataViewField[];
    splitFieldsOptions: DataViewField[];
};
export declare const ChangePointDetectionControlsContextProvider: FC<PropsWithChildren<unknown>>;
export declare const ChangePointDetectionContextProvider: FC<PropsWithChildren<unknown>>;
export declare function useChangePointDetectionContext(): {
    timeBuckets: TimeBuckets;
    bucketInterval: TimeBucketsInterval;
    requestParams: ChangePointDetectionRequestParams;
    metricFieldOptions: DataViewField[];
    splitFieldsOptions: DataViewField[];
    updateRequestParams: (update: Partial<ChangePointDetectionRequestParams>) => void;
    resultFilters: Filter[];
    updateFilters: (update: Filter[]) => void;
    resultQuery: Query;
    combinedQuery: QueryDslQueryContainer;
    selectedChangePoints: Record<number, SelectedChangePoint[]>;
    setSelectedChangePoints: (update: Record<number, SelectedChangePoint[]>) => void;
};
export declare function useRequestParams(): ChangePointDetectionRequestParams;
