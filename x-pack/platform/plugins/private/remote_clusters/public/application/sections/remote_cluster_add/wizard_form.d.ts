import React from 'react';
import type { ClusterPayload } from '../../../../common/lib/cluster_serialization';
interface Props {
    saveRemoteClusterConfig: (config: ClusterPayload) => void;
    onCancel: () => void;
    addClusterError: {
        message: string;
    } | undefined;
    isSaving: boolean;
}
export declare const RemoteClusterWizard: ({ saveRemoteClusterConfig, onCancel, isSaving, addClusterError, }: Props) => React.JSX.Element;
export {};
