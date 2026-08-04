import type { FileLayer, TMSService } from '@elastic/ems-client';
import type { MapConfig } from '@kbn/maps-ems-plugin/public';
export declare function getKibanaTileMap(): Partial<MapConfig['tilemap']>;
export declare function getEmsFileLayers(): Promise<FileLayer[]>;
export declare function getEmsTmsServices(): Promise<TMSService[]>;
export declare function isRetina(): boolean;
