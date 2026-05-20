import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { TimeRange } from '@kbn/es-query';
interface Params {
    dataViews: DataViewsServicePublic;
    lens: LensPublicStart;
    lensConfig: any;
    timeRange?: TimeRange;
}
interface ReturnValue {
    lensInput: TypedLensByValueInput | undefined;
    setLensInput: (v: TypedLensByValueInput) => void;
    isLoading: boolean;
    error?: Error;
}
export declare function useLensInput({ dataViews, lens, lensConfig, timeRange }: Params): ReturnValue;
export {};
