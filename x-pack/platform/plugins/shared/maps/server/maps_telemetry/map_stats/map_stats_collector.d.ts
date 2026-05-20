import type { MapAttributes } from '../..';
import type { ClusterCountStats, MapStats } from './types';
export declare class MapStatsCollector {
    private _mapCount;
    private _basemapClusterStats;
    private _joinClusterStats;
    private _layerClusterStats;
    private _resolutionClusterStats;
    private _scalingClusterStats;
    private _emsFileClusterStats;
    private _layerCountStats;
    private _layerTypeClusterStats;
    private _customIconsCountStats;
    private _sourceCountStats;
    push(attributes: MapAttributes): void;
    getStats(): MapStats;
    _updateClusterStats(clusterStats: {
        [key: string]: ClusterCountStats;
    }, counts: {
        [key: string]: number;
    }): void;
    _excludeTotalFromKeyedStats(clusterStats: {
        [key: string]: ClusterCountStats;
    }): {
        [key: string]: Omit<ClusterCountStats, 'total'>;
    };
    _excludeTotal(stats: ClusterCountStats): Omit<ClusterCountStats, 'total'>;
}
