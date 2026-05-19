import type { Capabilities as UICapabilities } from '@kbn/core/server';
import type { ElasticsearchFeature, KibanaFeature } from '../common';
export declare function uiCapabilitiesForFeatures(kibanaFeatures: KibanaFeature[], elasticsearchFeatures: ElasticsearchFeature[]): UICapabilities;
