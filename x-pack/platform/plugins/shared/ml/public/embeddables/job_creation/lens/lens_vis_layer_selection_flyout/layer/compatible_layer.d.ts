import type { FC } from 'react';
import type { LensApi } from '@kbn/lens-plugin/public';
import type { LayerResult } from '../../../../../application/jobs/new_job/job_from_lens';
interface Props {
    layer: LayerResult;
    layerIndex: number;
    embeddable: LensApi;
}
export declare const CompatibleLayer: FC<Props>;
export {};
