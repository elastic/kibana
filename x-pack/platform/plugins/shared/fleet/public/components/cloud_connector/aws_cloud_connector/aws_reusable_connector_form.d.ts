import React from 'react';
import type { AccountType } from '../../../types';
import type { AwsCloudConnectorCredentials } from '../types';
export declare const AWSReusableConnectorForm: React.FC<{
    cloudConnectorId: string | undefined;
    isEditPage: boolean;
    credentials: AwsCloudConnectorCredentials;
    setCredentials: (credentials: AwsCloudConnectorCredentials) => void;
    accountType?: AccountType;
    packageName?: string;
    policyTemplate?: string;
}>;
