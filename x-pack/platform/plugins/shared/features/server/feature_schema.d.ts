import type { KibanaFeatureConfig } from '../common';
import type { ElasticsearchFeatureConfig } from '.';
export declare const uiCapabilitiesRegex: RegExp;
export declare function validateKibanaFeature(feature: KibanaFeatureConfig): void;
export declare function validateElasticsearchFeature(feature: ElasticsearchFeatureConfig): void;
