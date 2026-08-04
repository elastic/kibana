import type { AggDescriptor } from '../../../../common/descriptor_types';
import type { IESAggSource } from '../../sources/es_agg_source';
import type { FIELD_ORIGIN } from '../../../../common/constants';
import type { IESAggField } from './agg_field_types';
export declare function esAggFieldsFactory(aggDescriptor: AggDescriptor, source: IESAggSource, origin: FIELD_ORIGIN): IESAggField[];
