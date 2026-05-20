import type { FC } from 'react';
import type { MapApi } from '@kbn/maps-plugin/public';
import type { LayerResult } from '../../../../../application/jobs/new_job/job_from_map';
interface Props {
    layer: LayerResult;
    layerIndex: number;
    embeddable: MapApi;
}
export declare const Layer: FC<Props>;
export {};
