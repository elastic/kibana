import type { MapAttributes } from '../../server';
export declare class LayerStatsCollector {
    private _layerCount;
    private _basemapCounts;
    private _joinCounts;
    private _layerCounts;
    private _resolutionCounts;
    private _scalingCounts;
    private _emsFileCounts;
    private _layerTypeCounts;
    private _sourceIds;
    constructor(attributes: MapAttributes);
    getLayerCount(): number;
    getBasemapCounts(): {
        roadmap_desaturated?: number | undefined;
        roadmap?: number | undefined;
        auto?: number | undefined;
        dark?: number | undefined;
    };
    getJoinCounts(): {
        distance?: number | undefined;
        term?: number | undefined;
    };
    getLayerCounts(): {
        es_docs?: number | undefined;
        es_top_hits?: number | undefined;
        es_tracks?: number | undefined;
        es_point_to_point?: number | undefined;
        es_agg_clusters?: number | undefined;
        es_agg_grids?: number | undefined;
        es_agg_hexagons?: number | undefined;
        es_agg_heatmap?: number | undefined;
        es_ml_anomalies?: number | undefined;
        esql?: number | undefined;
        ems_region?: number | undefined;
        ems_basemap?: number | undefined;
        kbn_tms_raster?: number | undefined;
        layer_group?: number | undefined;
        ux_tms_raster?: number | undefined;
        ux_tms_mvt?: number | undefined;
        ux_wms?: number | undefined;
    };
    getResolutionCounts(): {
        coarse?: number | undefined;
        fine?: number | undefined;
        most_fine?: number | undefined;
        super_fine?: number | undefined;
    };
    getScalingCounts(): {
        limit?: number | undefined;
        mvt?: number | undefined;
        clusters?: number | undefined;
    };
    getEmsFileCounts(): {
        [key: string]: number;
    };
    getLayerTypeCounts(): {
        [key: string]: number;
    };
    getSourceCount(): number;
    _updateCounts(key: string | null, counts: {
        [key: string]: number;
    }): void;
}
