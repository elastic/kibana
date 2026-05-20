import type { PackageInfo } from '../../../../../types';
interface Params {
    packageInfo: PackageInfo | undefined;
    namespace: string | undefined;
    onEnabledChange: ((enabled: boolean, isInit?: boolean) => void) | undefined;
    isManaged: boolean;
    packagePolicyId: string | undefined;
}
interface Result {
    showToggle: boolean;
    currentNamespace: string;
    isPrefixAllowed: boolean;
    isToggleDisabled: boolean;
    namespaceCustomizationEnabled: boolean;
    isOptedIn: boolean;
    otherPoliciesCount: number;
    showOptInImpactWarning: boolean;
    showOptOutImpactWarning: boolean;
    handleToggleChange: (enabled: boolean) => void;
}
export declare function useNamespaceCustomization({ packageInfo, namespace, onEnabledChange, isManaged, packagePolicyId, }: Params): Result;
export {};
