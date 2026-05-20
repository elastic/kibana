import React from 'react';
import type { AccountType } from '../../../types';
import type { CloudConnectorCredentials, CloudProviders } from '../types';
interface CloudConnectorSelectorProps {
    provider: CloudProviders;
    cloudConnectorId: string | undefined;
    credentials: CloudConnectorCredentials;
    setCredentials: (credentials: CloudConnectorCredentials) => void;
    accountType?: AccountType;
    packageName?: string;
    policyTemplate?: string;
}
export declare const CloudConnectorSelector: ({ provider, cloudConnectorId, credentials, setCredentials, accountType, packageName, policyTemplate, }: CloudConnectorSelectorProps) => React.JSX.Element;
export {};
