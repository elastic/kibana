import React from 'react';
import type { SecuredSubFeature } from '@kbn/security-role-management-model';
import type { PrivilegeFormCalculator } from '../privilege_form_calculator';
interface Props {
    featureId: string;
    subFeature: SecuredSubFeature;
    selectedFeaturePrivileges: string[];
    privilegeCalculator: PrivilegeFormCalculator;
    privilegeIndex: number;
    onChange: (selectedPrivileges: string[]) => void;
    disabled?: boolean;
    categoryId?: string;
    allSpacesSelected?: boolean;
}
export declare const SubFeatureForm: (props: Props) => React.JSX.Element | null;
export {};
