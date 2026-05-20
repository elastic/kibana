import React from 'react';
import type { RequestError } from '../../../../../types';
import type { ClusterPayload } from '../../../../../../common/lib';
interface Props {
    onBack?: () => void;
    onSubmit: () => void;
    isSaving?: boolean;
    saveError?: RequestError;
    cluster: ClusterPayload;
    securityModel: string;
}
export declare const RemoteClusterReview: ({ onBack, onSubmit, isSaving, saveError, cluster, securityModel, }: Props) => React.JSX.Element;
export {};
