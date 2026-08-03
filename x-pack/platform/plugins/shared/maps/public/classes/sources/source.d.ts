import type { ReactElement } from 'react';
import type { IField } from '../fields/field';
import type { FieldFormatter, LAYER_TYPE } from '../../../common/constants';
import type { Attribution, DataFilters, DataRequestMeta, StyleDescriptor, Timeslice } from '../../../common/descriptor_types';
import type { IStyle } from '../styles/style';
import type { LICENSED_FEATURES } from '../../licensed_features';
export type OnSourceChangeArgs = {
    propName: string;
    value: unknown;
    newLayerType?: LAYER_TYPE;
};
export type SourceEditorArgs = {
    currentLayerType: string;
    hasSpatialJoins: boolean;
    numberOfJoins: number;
    onChange: (...args: OnSourceChangeArgs[]) => Promise<void>;
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void;
    style: IStyle;
};
export type ImmutableSourceProperty = {
    label: string;
    value: string;
    link?: string;
};
export interface ISource {
    getDisplayName(): Promise<string>;
    getType(): string;
    isFieldAware(): boolean;
    isFilterByMapBounds(): boolean;
    isQueryAware(): boolean;
    isTimeAware(): Promise<boolean>;
    getImmutableProperties(dataFilters: DataFilters): Promise<ImmutableSourceProperty[]>;
    getAttributionProvider(): (() => Promise<Attribution[]>) | null;
    renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> | null;
    supportsFitToBounds(): Promise<boolean>;
    cloneDescriptor(): object;
    getApplyGlobalQuery(): boolean;
    getApplyGlobalTime(): boolean;
    getApplyForceRefresh(): boolean;
    createFieldFormatter(field: IField): Promise<FieldFormatter | null>;
    getValueSuggestions(field: IField, query: string): Promise<string[]>;
    getMinZoom(): number;
    getMaxZoom(): number;
    getLicensedFeatures(): Promise<LICENSED_FEATURES[]>;
    getUpdateDueToTimeslice(prevMeta: DataRequestMeta, timeslice?: Timeslice): boolean;
}
export declare class AbstractSource implements ISource {
    readonly _descriptor: object;
    constructor(descriptor: object);
    cloneDescriptor(): object;
    supportsFitToBounds(): Promise<boolean>;
    /**
     * return list of immutable source properties.
     * Immutable source properties are properties that can not be edited by the user.
     */
    getImmutableProperties(): Promise<ImmutableSourceProperty[]>;
    getType(): string;
    getDisplayName(): Promise<string>;
    getAttributionProvider(): (() => Promise<Attribution[]>) | null;
    isFieldAware(): boolean;
    isQueryAware(): boolean;
    renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> | null;
    getApplyGlobalQuery(): boolean;
    getApplyGlobalTime(): boolean;
    getApplyForceRefresh(): boolean;
    createFieldFormatter(field: IField): Promise<FieldFormatter | null>;
    getValueSuggestions(field: IField, query: string): Promise<string[]>;
    isTimeAware(): Promise<boolean>;
    isFilterByMapBounds(): boolean;
    getMinZoom(): number;
    getMaxZoom(): number;
    getLicensedFeatures(): Promise<LICENSED_FEATURES[]>;
    getUpdateDueToTimeslice(prevMeta: DataRequestMeta, timeslice?: Timeslice): boolean;
}
