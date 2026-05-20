import type { DataView } from '@kbn/data-plugin/common';
import type { AGG_TYPE } from '../../../../common/constants';
import type { IESSource } from '../es_source/types';
import type { IESAggField } from '../../fields/agg';
export declare function hasESAggSourceMethod(source: IESSource, methodName: keyof IESAggSource): source is Pick<IESAggSource, typeof methodName>;
export interface IESAggSource extends IESSource {
    getAggKey(aggType: AGG_TYPE, fieldName: string): string;
    getAggLabel(aggType: AGG_TYPE, fieldLabel: string): Promise<string>;
    getBucketsName(): string;
    getMetricFields(): IESAggField[];
    getMetricFieldForName(fieldName: string): IESAggField | null;
    getValueAggsDsl(indexPattern: DataView): {
        [key: string]: unknown;
    };
    isGeoGridPrecisionAware(): boolean;
    getGeoGridPrecision(zoom: number): number;
}
export interface ESAggsSourceSyncMeta {
    metrics: string[];
}
