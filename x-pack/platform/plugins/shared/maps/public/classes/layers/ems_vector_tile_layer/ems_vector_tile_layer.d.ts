import type { Map as MbMap, LayerSpecification, StyleSpecification } from '@kbn/mapbox-gl';
import { type EmsSpriteSheet } from '@elastic/ems-client';
import { AbstractLayer, type LayerIcon } from '../layer';
import type { EMSVectorTileLayerDescriptor } from '../../../../common/descriptor_types';
import type { DataRequest } from '../../util/data_request';
import type { DataRequestContext } from '../../../actions';
import type { EMSTMSSource } from '../../sources/ems_tms_source';
import { EMSVectorTileStyle } from '../../styles/ems/ems_vector_tile_style';
import type { SpriteMeta } from '../../sources/ems_tms_source/ems_tms_source';
interface SourceRequestMeta {
    tileLayerId: string;
}
export declare class EmsVectorTileLayer extends AbstractLayer {
    private readonly _style;
    protected readonly _descriptor: EMSVectorTileLayerDescriptor;
    static createDescriptor(options: Partial<EMSVectorTileLayerDescriptor>): EMSVectorTileLayerDescriptor;
    constructor({ source, layerDescriptor, }: {
        source: EMSTMSSource;
        layerDescriptor: EMSVectorTileLayerDescriptor;
    });
    _isTiled(): boolean;
    getSource(): EMSTMSSource;
    getStyleForEditing(): EMSVectorTileStyle;
    getStyle(): EMSVectorTileStyle;
    getCurrentStyle(): EMSVectorTileStyle;
    getLocale(): string;
    _canSkipSync({ prevDataRequest, nextMeta, }: {
        prevDataRequest?: DataRequest;
        nextMeta: SourceRequestMeta;
    }): boolean;
    syncData({ startLoading, stopLoading, onLoadError }: DataRequestContext): Promise<void>;
    _generateMbId(name: string): string;
    _generateMbSourceIdPrefix(): string;
    _generateMbSourceId(name: string | undefined): string;
    _getVectorStyle(): StyleSpecification | null | undefined;
    _getSpriteMeta(): SpriteMeta | null | undefined;
    _getSpriteImageData(): ImageData | null | undefined;
    getMbLayerIds(): string[];
    getMbSourceIds(): string[];
    ownsMbLayerId(mbLayerId: string): boolean;
    ownsMbSourceId(mbSourceId: string): boolean;
    _makeNamespacedImageId(imageId: string): string;
    _requiresPrevSourceCleanup(mbMap: MbMap): boolean;
    _getImageData(img: HTMLImageElement): ImageData;
    _isCrossOriginUrl(url: string): boolean;
    _loadSpriteSheetImageData(imgUrl: string): Promise<ImageData>;
    _addSpriteSheetToMapFromImageData(json: EmsSpriteSheet, imgData: ImageData, mbMap: MbMap): void;
    syncLayerWithMB(mbMap: MbMap): void;
    _getOpacityProps(layerType: string): string[];
    _setColorFilter(mbMap: MbMap, mbLayer: LayerSpecification, mbLayerId: string): void;
    _setOpacityForType(mbMap: MbMap, mbLayer: LayerSpecification, mbLayerId: string): void;
    _setLanguage(mbMap: MbMap, mbLayer: LayerSpecification, mbLayerId: string): void;
    _setLayerZoomRange(mbMap: MbMap, mbLayer: LayerSpecification, mbLayerId: string): void;
    _setTileLayerProperties(mbMap: MbMap): void;
    areLabelsOnTop(): boolean;
    supportsLabelsOnTop(): boolean;
    supportsLabelLocales(): boolean;
    getLicensedFeatures(): Promise<import("../../../licensed_features").LICENSED_FEATURES[]>;
    getLayerTypeIconName(): string;
    getLayerIcon(): LayerIcon;
    isBasemap(order: number): order is 0;
}
export {};
