import type { FunctionComponent } from 'react';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/public';
import type { CustomizeSpaceFormValues } from '../../types';
interface Props {
    space: CustomizeSpaceFormValues;
    features: KibanaFeatureConfig[];
    onChange: (space: CustomizeSpaceFormValues) => void;
}
export declare const EnabledFeatures: FunctionComponent<Props>;
export {};
