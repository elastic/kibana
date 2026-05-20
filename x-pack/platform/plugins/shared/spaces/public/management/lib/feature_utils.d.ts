import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import type { Space } from '../../../common';
export declare function getEnabledFeatures(features: KibanaFeatureConfig[], space: Partial<Space>): KibanaFeatureConfig[];
