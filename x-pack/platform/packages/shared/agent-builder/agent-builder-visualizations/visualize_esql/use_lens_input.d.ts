import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { ChartType } from '@kbn/visualization-utils';
import type { EsqlResults } from '@kbn/agent-builder-common/tools/tool_result';
import type { TimeRange } from '@kbn/agent-builder-common';
interface Params {
    esqlQuery: string;
    dataViews: DataViewsServicePublic;
    lens: LensPublicStart;
    esqlColumns: EsqlResults['data']['columns'] | undefined;
    preferredChartType?: ChartType;
    timeRange?: TimeRange;
}
interface ReturnValue {
    lensInput: TypedLensByValueInput | undefined;
    setLensInput: (v: TypedLensByValueInput) => void;
    isLoading: boolean;
    error?: Error;
}
export declare function useLensInput({ esqlQuery, dataViews, lens, esqlColumns, preferredChartType, timeRange, }: Params): ReturnValue;
export {};
