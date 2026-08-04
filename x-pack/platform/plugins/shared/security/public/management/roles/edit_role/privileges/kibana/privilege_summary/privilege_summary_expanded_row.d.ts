import React from 'react';
import type { SecuredFeature } from '@kbn/security-role-management-model';
import type { EffectiveFeaturePrivileges } from './privilege_summary_calculator';
type EffectivePrivilegesTuple = [string[], EffectiveFeaturePrivileges['featureId']];
interface Props {
    feature: SecuredFeature;
    effectiveFeaturePrivileges: EffectivePrivilegesTuple[];
}
export declare const PrivilegeSummaryExpandedRow: (props: Props) => React.JSX.Element;
export {};
