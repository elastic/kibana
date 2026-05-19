import type { DataStatsFetchProgress } from '../../../common/types/field_stats';
export declare const getInitialProgress: () => DataStatsFetchProgress;
export declare const getReducer: <T>() => (prev: T, update: Partial<T>) => T;
