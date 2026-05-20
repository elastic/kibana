import type { FC } from 'react';
import type { MapApi } from '@kbn/maps-plugin/public';
interface Props {
    embeddable: MapApi;
    onClose: () => void;
}
export declare const GeoJobFlyout: FC<Props>;
export {};
