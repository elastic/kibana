import React from 'react';
import type { Map as MapboxMap } from '@kbn/mapbox-gl';
interface Props {
    isFullScreen: boolean;
    mbMap: MapboxMap;
}
export declare const ScaleControl: React.FC<Props>;
export {};
