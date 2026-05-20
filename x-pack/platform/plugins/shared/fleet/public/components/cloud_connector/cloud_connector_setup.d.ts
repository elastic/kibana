import React from 'react';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { NewPackagePolicy, PackageInfo } from '../../../common';
import type { AccountType, CloudProvider } from '../../types';
import type { UpdatePolicy } from './types';
export interface CloudConnectorSetupProps {
    newPolicy: NewPackagePolicy;
    packageInfo: PackageInfo;
    updatePolicy: UpdatePolicy;
    isEditPage?: boolean;
    hasInvalidRequiredVars: boolean;
    cloud?: CloudSetup;
    cloudProvider?: CloudProvider;
    templateName: string;
    /** Optional account type. When undefined, defaults to 'single-account'. */
    accountType?: AccountType;
    /** Optional IaC template URL from var_group selection. When provided, overrides template URL from packageInfo.policy_templates. */
    iacTemplateUrl?: string;
}
export declare const CloudConnectorSetup: React.FC<CloudConnectorSetupProps>;
