import type { FC } from 'react';
import type { MapApi } from '@kbn/maps-plugin/public';
import { type LayerResult } from '../../../../../application/jobs/new_job/job_from_map';
interface Props {
    embeddable: MapApi;
    layer: LayerResult;
    layerIndex: number;
}
export declare const CompatibleLayer: FC<Props>;
export {};
