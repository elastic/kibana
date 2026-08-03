import type { Goto, MapCenterAndZoom, MapSettings } from '../../../common/descriptor_types';
export declare function getInitialView(goto: Goto | null | undefined, settings: MapSettings): Promise<MapCenterAndZoom | null>;
