import type { DataView } from '@kbn/data-plugin/common';
import type { IField } from '../field';
import type { IESAggSource } from '../../sources/es_agg_source';
import type { FIELD_ORIGIN } from '../../../../common/constants';
import type { AggDescriptor } from '../../../../common/descriptor_types';
export interface IESAggField extends IField {
    getValueAggDsl(indexPattern: DataView): unknown | null;
    getBucketCount(): number;
    getMask(): AggDescriptor['mask'] | undefined;
}
export interface CountAggFieldParams {
    label?: string;
    source: IESAggSource;
    origin: FIELD_ORIGIN;
    mask?: AggDescriptor['mask'];
}
