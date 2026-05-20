import type { FC } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import type { Query } from '@kbn/data-plugin/common/query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { type RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { LegendType } from '../vega_chart/common';
export interface ScatterplotMatrixProps {
    fields: string[];
    index: string;
    resultsField?: string;
    color?: string;
    legendType?: LegendType;
    searchQuery?: estypes.QueryDslQueryContainer;
    runtimeMappings?: RuntimeMappings;
    projectRouting?: string;
    dataView?: DataView;
    query?: Query;
}
export declare const ScatterplotMatrix: FC<ScatterplotMatrixProps>;
