import type { GeoJsonProperties } from 'geojson';
import type { DataView } from '@kbn/data-plugin/common';
import type { IESAggSource, ESAggsSourceSyncMeta } from './types';
import { AbstractESSource } from '../es_source';
import type { IESAggField } from '../../fields/agg';
import { AGG_TYPE, FIELD_ORIGIN } from '../../../../common/constants';
import type { AbstractESAggSourceDescriptor, DataFilters } from '../../../../common/descriptor_types';
import type { IField } from '../../fields/field';
import type { ITooltipProperty } from '../../tooltips/tooltip_property';
export declare const DEFAULT_METRIC: {
    type: AGG_TYPE;
};
export declare abstract class AbstractESAggSource extends AbstractESSource implements IESAggSource {
    private readonly _metricFields;
    static createDescriptor(descriptor: Partial<AbstractESAggSourceDescriptor>): AbstractESAggSourceDescriptor & Required<Pick<AbstractESAggSourceDescriptor, 'metrics'>>;
    constructor(descriptor: AbstractESAggSourceDescriptor);
    getBucketsName(): string;
    getFieldByName(fieldName: string): IField | null;
    createField({ fieldName }: {
        fieldName: string;
    }): IField;
    getMetricFieldForName(fieldName: string): IESAggField | null;
    getOriginForField(): FIELD_ORIGIN;
    getMetricFields(): IESAggField[];
    getAggKey(aggType: AGG_TYPE, fieldName: string): string;
    getAggLabel(aggType: AGG_TYPE, fieldLabel: string): Promise<string>;
    getFields(): Promise<IField[]>;
    getValueAggsDsl(indexPattern: DataView, metricsFilter?: (metric: IESAggField) => boolean): {
        [key: string]: unknown;
    };
    getTooltipProperties(mbProperties: GeoJsonProperties): Promise<ITooltipProperty[]>;
    isGeoGridPrecisionAware(): boolean;
    isFieldAware(): boolean;
    getSyncMeta(dataFilters: DataFilters): ESAggsSourceSyncMeta;
    getGeoGridPrecision(zoom: number): number;
}
