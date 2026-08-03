import type { Map as MbMap } from '@kbn/mapbox-gl';
import type { ReactElement } from 'react';
import { AbstractLayer } from '../layer';
import type { LayerDescriptor, RasterLayerDescriptor } from '../../../../common/descriptor_types';
import { TileStyle } from '../../styles/tile/tile_style';
import type { DataRequestContext } from '../../../actions';
import type { IRasterSource } from '../../sources/raster_source';
export declare class RasterTileLayer extends AbstractLayer {
    static createDescriptor(options: Partial<LayerDescriptor>): RasterLayerDescriptor;
    private readonly _style;
    constructor({ source, layerDescriptor, }: {
        source: IRasterSource;
        layerDescriptor: RasterLayerDescriptor;
    });
    _isTiled(): boolean;
    getSource(): IRasterSource;
    hasLegendDetails(): Promise<boolean>;
    renderLegendDetails(): ReactElement<any> | null;
    getStyleForEditing(): TileStyle;
    getStyle(): TileStyle;
    getCurrentStyle(): TileStyle;
    syncData({ startLoading, stopLoading, onLoadError, dataFilters, isForceRefresh, }: DataRequestContext): Promise<void>;
    _getMbLayerId(): string;
    getMbLayerIds(): string[];
    ownsMbLayerId(mbLayerId: string): boolean;
    ownsMbSourceId(mbSourceId: string): boolean;
    _requiresPrevSourceCleanup(mbMap: MbMap): boolean;
    syncLayerWithMB(mbMap: MbMap): void;
    _setTileLayerProperties(mbMap: MbMap, mbLayerId: string): void;
    getLayerTypeIconName(): string;
    isBasemap(order: number): order is 0;
    isFilteredByGlobalTime(): Promise<boolean>;
}
