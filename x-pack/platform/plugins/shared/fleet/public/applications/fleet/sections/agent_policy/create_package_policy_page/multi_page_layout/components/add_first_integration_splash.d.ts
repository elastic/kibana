import React from 'react';
import type { RegistryPolicyTemplate, PackageInfo } from '../../../../../types';
import type { RequestError } from '../../../../../hooks';
export declare const AddFirstIntegrationSplashScreen: React.FC<{
    integrationInfo?: RegistryPolicyTemplate;
    error?: RequestError | null;
    packageInfo?: PackageInfo;
    isLoading: boolean;
    cancelClickHandler?: React.ReactEventHandler;
    cancelUrl: string;
    onNext: () => void;
}>;
