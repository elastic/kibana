import type { ReactElement } from 'react';
import type { GeoJsonProperties } from 'geojson';
import type { FileLayer } from '@elastic/ems-client';
import type { ImmutableSourceProperty, SourceEditorArgs } from '../source';
import type { GeoJsonWithMeta, IVectorSource } from '../vector_source';
import { AbstractVectorSource } from '../vector_source';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import type { IField } from '../../fields/field';
import type { EMSFileSourceDescriptor } from '../../../../common/descriptor_types';
import type { ITooltipProperty } from '../../tooltips/tooltip_property';
import { LICENSED_FEATURES } from '../../../licensed_features';
export interface IEmsFileSource extends IVectorSource {
    getEmsFieldLabel(emsFieldName: string): Promise<string>;
}
export declare function getSourceTitle(): string;
export declare class EMSFileSource extends AbstractVectorSource implements IEmsFileSource {
    static createDescriptor({ id, tooltipProperties }: Partial<EMSFileSourceDescriptor>): EMSFileSourceDescriptor;
    private readonly _tooltipFields;
    readonly _descriptor: EMSFileSourceDescriptor;
    constructor(descriptor: Partial<EMSFileSourceDescriptor>);
    renderSourceSettingsEditor({ onChange }: SourceEditorArgs): ReactElement<any> | null;
    getEMSFileLayer(): Promise<FileLayer>;
    getEmsFieldLabel(emsFieldName: string): Promise<string>;
    getGeoJsonWithMeta(): Promise<GeoJsonWithMeta>;
    getImmutableProperties(): Promise<ImmutableSourceProperty[]>;
    getDisplayName(): Promise<string>;
    getAttributionProvider(): () => Promise<{
        url: string;
        label: string;
    }[]>;
    getFields(): Promise<IField[]>;
    getFieldByName(fieldName: string): IField;
    getLeftJoinFields(): Promise<IField[]>;
    hasTooltipProperties(): boolean;
    getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
    getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]>;
    getLicensedFeatures(): Promise<LICENSED_FEATURES[]>;
    private _getFieldValues;
    getValueSuggestions: (field: IField, query: string) => Promise<string[]>;
}
