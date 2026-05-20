import type { FC } from 'react';
import type { LayerDescriptor } from '@kbn/maps-plugin/common';
import type { Aggregation, Field, SplitField } from '@kbn/ml-anomaly-utils';
interface Props {
    dataViewId?: string;
    geoField: Field | null;
    splitField: SplitField;
    fieldValues: string[];
    geoAgg: Aggregation | null;
    layerList: LayerDescriptor[];
}
export declare const GeoMapExamples: FC<Props>;
export {};
