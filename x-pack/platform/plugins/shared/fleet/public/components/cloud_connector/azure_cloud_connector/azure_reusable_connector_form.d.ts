import React from 'react';
import type { AccountType } from '../../../types';
import type { AzureCloudConnectorCredentials } from '../types';
export declare const AzureReusableConnectorForm: React.FC<{
    cloudConnectorId: string | undefined;
    isEditPage: boolean;
    credentials: AzureCloudConnectorCredentials;
    setCredentials: (credentials: AzureCloudConnectorCredentials) => void;
    accountType?: AccountType;
    packageName?: string;
    policyTemplate?: string;
}>;
