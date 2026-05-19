import type { MapStats } from './map_stats';
export type MapsUsage = MapStats;
export declare function getMapsTelemetry(): Promise<MapsUsage>;
