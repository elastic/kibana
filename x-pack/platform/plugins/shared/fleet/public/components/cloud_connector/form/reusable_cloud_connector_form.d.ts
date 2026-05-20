import React from 'react';
import type { NewPackagePolicy } from '../../../../common';
import type { CloudProvider, AccountType } from '../../../types';
import type { CloudConnectorCredentials } from '../types';
export declare const ReusableCloudConnectorForm: React.FC<{
    credentials: CloudConnectorCredentials;
    setCredentials: (credentials: CloudConnectorCredentials) => void;
    newPolicy: NewPackagePolicy;
    cloudProvider?: CloudProvider;
    isEditPage: boolean;
    accountType?: AccountType;
    packageName?: string;
    policyTemplate?: string;
}>;
