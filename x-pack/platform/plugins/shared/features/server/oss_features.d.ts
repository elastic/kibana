import type { KibanaFeatureConfig } from '../common';
export interface BuildOSSFeaturesParams {
    savedObjectTypes: string[];
    includeReporting: boolean;
}
export declare const buildOSSFeatures: ({ savedObjectTypes, includeReporting, }: BuildOSSFeaturesParams) => KibanaFeatureConfig[];
