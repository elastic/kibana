import type { PackageInfo, NewAgentPolicy, NewPackagePolicy } from '../../../../../types';
import { SelectedPolicyTab } from '../../components';
export declare function useDevToolsRequest({ newAgentPolicy, packagePolicy, packageInfo, selectedPolicyTab, withSysMonitoring, packagePolicyId, }: {
    withSysMonitoring: boolean;
    selectedPolicyTab: SelectedPolicyTab;
    newAgentPolicy: NewAgentPolicy;
    packagePolicy: NewPackagePolicy;
    packageInfo?: PackageInfo;
    packagePolicyId?: string;
}): {
    showDevtoolsRequest: boolean;
    devtoolRequest: string;
    devtoolRequestDescription: string;
};
