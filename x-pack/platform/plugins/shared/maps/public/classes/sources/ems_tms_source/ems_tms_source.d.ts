import React from 'react';
import type { EmsSpriteSheet } from '@elastic/ems-client';
import type { SourceEditorArgs } from '../source';
import { AbstractSource } from '../source';
import type { ITMSSource } from '../tms_source';
import type { EMSTMSSourceDescriptor } from '../../../../common/descriptor_types';
import { LICENSED_FEATURES } from '../../../licensed_features';
export interface SpriteMeta {
    png: string;
    json: EmsSpriteSheet;
}
export declare function getSourceTitle(): string;
type NormalizedEMSTMSSourceDescriptor = EMSTMSSourceDescriptor & Required<Pick<EMSTMSSourceDescriptor, 'isAutoSelect' | 'lightModeDefault'>>;
export declare class EMSTMSSource extends AbstractSource implements ITMSSource {
    static createDescriptor(descriptor: Partial<EMSTMSSourceDescriptor>): NormalizedEMSTMSSourceDescriptor;
    readonly _descriptor: NormalizedEMSTMSSourceDescriptor;
    constructor(descriptor: Partial<EMSTMSSourceDescriptor>);
    renderSourceSettingsEditor({ onChange }: SourceEditorArgs): React.JSX.Element;
    getImmutableProperties(): Promise<{
        label: string;
        value: string;
    }[]>;
    _getEMSTMSService(): Promise<import("@elastic/ems-client").TMSService>;
    getDisplayName(): Promise<string>;
    _getTileServiceName(): Promise<string>;
    getAttributionProvider(): () => Promise<{
        url: string;
        label: string;
    }[]>;
    getUrlTemplate(): Promise<string>;
    getSpriteNamespacePrefix(): string;
    getVectorStyleSheetAndSpriteMeta(isRetina: boolean): Promise<{
        vectorStyleSheet?: unknown;
        spriteMeta?: SpriteMeta;
    }>;
    getTileLayerId(): string;
    getLicensedFeatures(): Promise<LICENSED_FEATURES[]>;
}
export {};
