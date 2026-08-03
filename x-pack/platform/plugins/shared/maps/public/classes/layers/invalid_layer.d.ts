import type { LayerDescriptor } from '../../../common/descriptor_types';
import { AbstractLayer } from './layer';
import type { IStyle } from '../styles/style';
export declare class InvalidLayer extends AbstractLayer {
    private readonly _error;
    private readonly _style;
    constructor(layerDescriptor: LayerDescriptor, error: Error);
    isLayerLoading(): boolean;
    hasErrors(): boolean;
    getErrors(): {
        title: string;
        body: string;
    }[];
    getStyleForEditing(): IStyle;
    getStyle(): IStyle;
    getCurrentStyle(): IStyle;
    getMbLayerIds(): never[];
    ownsMbLayerId(): boolean;
    ownsMbSourceId(): boolean;
    syncLayerWithMB(): void;
    getLayerTypeIconName(): string;
}
