import type { ReactNode } from 'react';
import React from 'react';
import type { PROXY_MODE, SNIFF_MODE } from '../../../../../../common/constants';
import type { ClusterPayload } from '../../../../../../common/lib';
interface Props {
    showRequest: boolean;
    disabled?: boolean;
    isSaving?: boolean;
    handleNext: () => void;
    onBack?: () => void;
    confirmFormText: ReactNode;
    backFormText?: ReactNode;
    cluster?: ClusterPayload;
    nextButtonTestSubj: string;
    backButtonTestSubj?: string;
    previousClusterMode?: typeof PROXY_MODE | typeof SNIFF_MODE;
}
export declare const ActionButtons: React.FC<Props>;
export {};
