import type { FunctionComponent } from 'react';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/public';
import type { Space } from '../../../../common';
interface Props {
    space: Partial<Space>;
    features: KibanaFeatureConfig[];
    onChange: (space: Partial<Space>) => void;
}
export declare const EnabledFeatures: FunctionComponent<Props>;
export {};
