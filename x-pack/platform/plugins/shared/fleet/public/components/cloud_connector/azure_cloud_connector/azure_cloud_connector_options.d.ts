import React from 'react';
import type { PackagePolicyConfigRecord } from '../../../../common';
import type { CloudConnectorField } from '../types';
export declare const getAzureCloudConnectorsCredentialsFormOptions: (inputVars?: PackagePolicyConfigRecord | undefined) => {
    provider: string;
    fields: CloudConnectorField[];
    description: React.JSX.Element;
} | undefined;
