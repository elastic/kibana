import React from 'react';
import type { SecuredFeature } from '@kbn/security-role-management-model';
import type { PrivilegeFormCalculator } from '../privilege_form_calculator';
interface Props {
    feature: SecuredFeature;
    privilegeCalculator: PrivilegeFormCalculator;
    privilegeIndex: number;
    selectedFeaturePrivileges: string[];
    allSpacesSelected: boolean;
    disabled?: boolean;
    licenseAllowsSubFeatPrivCustomization: boolean;
    onChange: (featureId: string, featurePrivileges: string[]) => void;
}
export declare const FeatureTableExpandedRow: ({ feature, onChange, privilegeIndex, privilegeCalculator, selectedFeaturePrivileges, allSpacesSelected, disabled, licenseAllowsSubFeatPrivCustomization, }: Props) => React.JSX.Element;
export {};
