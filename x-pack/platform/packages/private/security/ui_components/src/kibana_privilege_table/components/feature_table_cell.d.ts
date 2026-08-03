import React from 'react';
import type { SecuredFeature } from '@kbn/security-role-management-model';
interface Props {
    feature: SecuredFeature;
    hasSubFeaturePrivileges?: boolean;
}
export declare const FeatureTableCell: ({ feature, hasSubFeaturePrivileges }: Props) => React.JSX.Element;
export {};
