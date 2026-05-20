import React from 'react';
import type { CloudConnectorVars, AccountType } from '../../../../common/types';
import type { CloudProviders } from '../types';
interface CloudConnectorPoliciesFlyoutProps {
    cloudConnectorId: string;
    cloudConnectorName: string;
    cloudConnectorVars: CloudConnectorVars;
    accountType?: AccountType;
    provider: CloudProviders;
    onClose: () => void;
}
export declare const CloudConnectorPoliciesFlyout: React.FC<CloudConnectorPoliciesFlyoutProps>;
export {};
