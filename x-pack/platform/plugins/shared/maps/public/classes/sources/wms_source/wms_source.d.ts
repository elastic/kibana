import type { ReactElement } from 'react';
import type { RasterTileSource } from 'maplibre-gl';
import { AbstractSource } from '../source';
import { SOURCE_TYPES } from '../../../../common/constants';
import type { IRasterSource, RasterTileSourceData } from '../raster_source';
import type { WMSSourceDescriptor } from '../../../../common/descriptor_types';
export declare const sourceTitle: string;
export declare class WMSSource extends AbstractSource implements IRasterSource {
    static type: SOURCE_TYPES;
    readonly _descriptor: WMSSourceDescriptor;
    static createDescriptor({ serviceUrl, layers, styles }: Partial<WMSSourceDescriptor>): WMSSourceDescriptor;
    constructor(sourceDescriptor: WMSSourceDescriptor);
    hasLegendDetails(): Promise<boolean>;
    renderLegendDetails(): ReactElement<any> | null;
    isSourceStale(mbSource: RasterTileSource, sourceData: RasterTileSourceData): boolean;
    canSkipSourceUpdate(): Promise<boolean>;
    getImmutableProperties(): Promise<{
        label: string;
        value: string;
    }[]>;
    getDisplayName(): Promise<string>;
    getUrlTemplate(): Promise<string>;
}
