import React from 'react';
import type { AccountType } from '../../../types';
import type { GcpCloudConnectorCredentials } from '../types';
export declare const GCPReusableConnectorForm: React.FC<{
    cloudConnectorId: string | undefined;
    isEditPage: boolean;
    credentials: GcpCloudConnectorCredentials;
    setCredentials: (credentials: GcpCloudConnectorCredentials) => void;
    accountType?: AccountType;
}>;
