import type { FileLayer } from '@elastic/ems-client';
export interface SampleValuesConfig {
    sampleValues?: Array<string | number>;
    sampleValuesColumnName?: string;
}
export interface EMSTermJoinConfig {
    layerId: string;
    field: string;
    displayName: string;
}
export declare function suggestEMSTermJoinConfig(sampleValuesConfig: SampleValuesConfig): Promise<EMSTermJoinConfig | null>;
export declare function emsAutoSuggest(sampleValuesConfig: SampleValuesConfig, fileLayers: FileLayer[]): EMSTermJoinConfig | null;
