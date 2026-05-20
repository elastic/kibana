import type { NewPackagePolicy, PackageInfo } from '../../../../common';
import type { AccountType, CloudProvider } from '../../../types';
import type { UpdatePolicy } from '../types';
import type { CloudConnectorCredentials } from '../types';
export interface UseCloudConnectorSetupReturn {
    newConnectionCredentials: CloudConnectorCredentials;
    setNewConnectionCredentials: (credentials: CloudConnectorCredentials) => void;
    existingConnectionCredentials: CloudConnectorCredentials;
    setExistingConnectionCredentials: (credentials: CloudConnectorCredentials) => void;
    updatePolicyWithNewCredentials: (credentials: CloudConnectorCredentials) => void;
    updatePolicyWithExistingCredentials: (credentials: CloudConnectorCredentials) => void;
    accountTypeFromInputs?: AccountType;
}
export declare const getAccountTypeFromInputs: (cloudProvider: CloudProvider, packagePolicy: NewPackagePolicy) => AccountType | undefined;
export declare const useCloudConnectorSetup: (newPolicy: NewPackagePolicy, updatePolicy: UpdatePolicy, packageInfo: PackageInfo, cloudProvider?: CloudProvider) => UseCloudConnectorSetupReturn;
