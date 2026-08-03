import type { Map as MbMap } from '@kbn/mapbox-gl';
import type { Writable } from '@kbn/utility-types';
import { AbstractLayer } from '../layer';
import { HeatmapStyle } from '../../styles/heatmap/heatmap_style';
import type { HeatmapLayerDescriptor } from '../../../../common/descriptor_types';
import type { ESGeoGridSource } from '../../sources/es_geo_grid_source';
import type { DataRequestContext } from '../../../actions';
export declare class HeatmapLayer extends AbstractLayer {
    private readonly _style;
    static createDescriptor(options: Partial<HeatmapLayerDescriptor>): Writable<HeatmapLayerDescriptor>;
    constructor({ layerDescriptor, source, }: {
        layerDescriptor: HeatmapLayerDescriptor;
        source: ESGeoGridSource;
    });
    _isTiled(): boolean;
    getLayerIcon(isTocIcon: boolean): import("../layer").LayerIcon | {
        icon: import("react").JSX.Element;
        tooltipContent: string;
    };
    getSource(): ESGeoGridSource;
    getStyleForEditing(): HeatmapStyle;
    getStyle(): HeatmapStyle;
    getCurrentStyle(): HeatmapStyle;
    _getHeatmapLayerId(): string;
    getMbLayerIds(): string[];
    ownsMbLayerId(mbLayerId: string): boolean;
    ownsMbSourceId(mbSourceId: string): boolean;
    syncData(syncContext: DataRequestContext): Promise<void>;
    _requiresPrevSourceCleanup(mbMap: MbMap): boolean;
    syncLayerWithMB(mbMap: MbMap): void;
    getLayerTypeIconName(): string;
    getFields(): Promise<import("../../..").IField[]>;
    hasLegendDetails(): Promise<boolean>;
    renderLegendDetails(): import("react").JSX.Element;
    getBounds(getDataRequestContext: (layerId: string) => DataRequestContext): Promise<import("../../../../common/descriptor_types").MapExtent | null>;
    isFilteredByGlobalTime(): Promise<boolean>;
    getIndexPatternIds(): string[];
    getQueryableIndexPatternIds(): string[];
    getLicensedFeatures(): Promise<import("../../../licensed_features").LICENSED_FEATURES[]>;
}
