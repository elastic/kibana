import type { FilterSpecification, Map as MbMap } from '@kbn/mapbox-gl';
import type { Feature } from 'geojson';
import type { VectorLayerArguments } from '../vector_layer';
import { AbstractVectorLayer } from '../vector_layer';
import type { IMvtVectorSource } from '../../../sources/vector_source';
import type { DataRequestContext } from '../../../../actions';
import type { DataRequestMeta, StyleMetaDescriptor, VectorLayerDescriptor } from '../../../../../common/descriptor_types';
import type { InnerJoin } from '../../../joins/inner_join';
import type { LayerIcon } from '../../layer';
import type { PropertiesMap } from '../../../../../common/elasticsearch_util';
export declare class MvtVectorLayer extends AbstractVectorLayer {
    static createDescriptor(descriptor: Partial<VectorLayerDescriptor>, mapColors?: string[]): VectorLayerDescriptor;
    readonly _source: IMvtVectorSource;
    constructor(args: VectorLayerArguments);
    isLayerLoading(zoom: number): boolean;
    _isTiled(): boolean;
    getBounds(getDataRequestContext: (layerId: string) => DataRequestContext): Promise<import("../../../../../common/descriptor_types").MapExtent | null>;
    getFeatureId(feature: Feature): string | number | undefined;
    getLayerIcon(isTocIcon: boolean): LayerIcon;
    _getMaxResultWindow(): number | undefined;
    _syncMaxResultWindow({ startLoading, stopLoading }: DataRequestContext): Promise<void>;
    syncData(syncContext: DataRequestContext): Promise<void>;
    _syncSourceBindingWithMb(mbMap: MbMap): void;
    getMbLayerIds(): string[];
    ownsMbSourceId(mbSourceId: string): boolean;
    _getJoinResults(): {
        join?: InnerJoin;
        joinPropertiesMap?: PropertiesMap;
        joinRequestMeta?: DataRequestMeta;
    };
    _getMbTooManyFeaturesLayerId(): string;
    _getJoinFilterExpression(): FilterSpecification | undefined;
    _syncFeatureState(mbMap: MbMap): void;
    _syncStylePropertiesWithMb(mbMap: MbMap): void;
    _syncTooManyFeaturesProperties(mbMap: MbMap): void;
    _getSourcePromoteId(): {
        [x: string]: string;
    } | undefined;
    _requiresPrevSourceCleanup(mbMap: MbMap): boolean;
    syncLayerWithMB(mbMap: MbMap): void;
    getMinZoom(): number;
    getFeatureById(id: string | number): Feature | null;
    getStyleMetaDescriptorFromLocalFeatures(): Promise<StyleMetaDescriptor | null>;
}
