import React from 'react';
import type { ReactNode } from 'react';
import type { Cluster, ClusterPayload } from '../../../../../../common/lib';
import type { RequestError } from '../../../../../types';
interface Props {
    confirmFormAction: (cluster: ClusterPayload) => void;
    onBack?: () => void;
    isSaving?: boolean;
    saveError?: RequestError;
    cluster?: Cluster;
    onConfigChange?: (cluster: ClusterPayload, hasErrors: boolean) => void;
    confirmFormText: ReactNode;
    backFormText: ReactNode;
}
export type FormFields = ClusterPayload & {
    cloudRemoteAddress?: string;
    cloudAdvancedOptionsEnabled: boolean;
};
export declare const RemoteClusterForm: React.FC<Props>;
export {};
