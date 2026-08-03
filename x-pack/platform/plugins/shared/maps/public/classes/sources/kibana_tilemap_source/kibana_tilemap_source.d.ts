import type { RasterTileSource } from 'maplibre-gl';
import { AbstractSource } from '../source';
import { SOURCE_TYPES } from '../../../../common/constants';
import type { IRasterSource, RasterTileSourceData } from '../raster_source';
export declare const sourceTitle: string;
export declare class KibanaTilemapSource extends AbstractSource implements IRasterSource {
    static type: SOURCE_TYPES;
    static createDescriptor(): {
        type: SOURCE_TYPES;
    };
    getImmutableProperties(): Promise<{
        label: string;
        value: string;
    }[]>;
    hasLegendDetails(): Promise<boolean>;
    renderLegendDetails(): null;
    isSourceStale(mbSource: RasterTileSource, sourceData: RasterTileSourceData): boolean;
    canSkipSourceUpdate(): Promise<boolean>;
    getUrlTemplate(): Promise<string>;
    getAttributionProvider(): () => Promise<Readonly<{} & {
        url: string;
        label: string;
    }>[]>;
    getDisplayName(): Promise<string>;
}
