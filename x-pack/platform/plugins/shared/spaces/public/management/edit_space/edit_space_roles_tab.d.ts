import type { FC } from 'react';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { Space } from '../../../common';
interface Props {
    space: Space;
    features: KibanaFeature[];
    isReadOnly: boolean;
}
export declare const EditSpaceAssignedRolesTab: FC<Props>;
export {};
