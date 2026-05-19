import type { ReactElement } from 'react';
import type { RasterTileSource } from 'maplibre-gl';
import { SOURCE_TYPES } from '../../../../common/constants';
import type { XYZTMSSourceDescriptor, DataRequestMeta } from '../../../../common/descriptor_types';
import type { ImmutableSourceProperty } from '../source';
import { AbstractSource } from '../source';
import type { XYZTMSSourceConfig } from './xyz_tms_editor';
import type { DataRequest } from '../../util/data_request';
import type { IRasterSource, RasterTileSourceData } from '../raster_source';
export declare const sourceTitle: string;
export declare class XYZTMSSource extends AbstractSource implements IRasterSource {
    static type: SOURCE_TYPES;
    readonly _descriptor: XYZTMSSourceDescriptor;
    static createDescriptor({ urlTemplate }: XYZTMSSourceConfig): XYZTMSSourceDescriptor;
    constructor(sourceDescriptor: XYZTMSSourceDescriptor);
    getImmutableProperties(): Promise<ImmutableSourceProperty[]>;
    getDisplayName(): Promise<string>;
    getUrlTemplate(): Promise<string>;
    hasLegendDetails(): Promise<boolean>;
    renderLegendDetails(): ReactElement<any> | null;
    isSourceStale(mbSource: RasterTileSource, sourceData: RasterTileSourceData): boolean;
    canSkipSourceUpdate(prevDataRequest: DataRequest, nextMeta: DataRequestMeta): Promise<boolean>;
}
