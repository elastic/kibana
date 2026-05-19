import type { FC } from 'react';
import type { VectorLayerDescriptor } from '@kbn/maps-plugin/common';
import type { EMSTermJoinConfig } from '@kbn/maps-plugin/public';
import type { FieldVisStats } from '../../../../../../../common/types';
export declare const getChoroplethTopValuesLayer: (fieldName: string, topValues: Array<{
    key: any;
    doc_count: number;
}>, { layerId, field }: EMSTermJoinConfig) => VectorLayerDescriptor;
interface Props {
    stats: FieldVisStats;
    suggestion: EMSTermJoinConfig;
}
export declare const ChoroplethMap: FC<Props>;
export {};
