import type React from 'react';
import type { RegistryPolicyTemplate, PackageInfo, AgentPolicy, EnrollmentAPIKey, EnrollmentSettingsProxy, DownloadSource } from '../../../../types';
export interface MultiPageStep {
    title: string;
    component: React.FC<MultiPageStepLayoutProps>;
}
export interface MultiPageStepLayoutProps {
    fleetServerHost: string;
    fleetProxy?: EnrollmentSettingsProxy;
    downloadSource?: DownloadSource;
    agentPolicy?: AgentPolicy;
    error?: Error;
    enrollmentAPIKey?: EnrollmentAPIKey;
    packageInfo: PackageInfo;
    integrationInfo?: RegistryPolicyTemplate;
    cancelClickHandler?: React.ReactEventHandler;
    onBack: React.ReactEventHandler;
    cancelUrl: string;
    steps: MultiPageStep[];
    currentStep: number;
    onNext: () => void;
    setIsManaged: (isManaged: boolean) => void;
    isManaged: boolean;
    setEnrolledAgentIds: (agentIds: string[]) => void;
    enrolledAgentIds: string[];
}
