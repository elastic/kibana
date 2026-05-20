import React from 'react';
import type { DataStreamResponse, DataStreamResultsFlyoutComponent } from './manage_integrations_table';
type ReviewDataStream = DataStreamResponse;
export interface ReviewIntegrationDetails {
    title: string;
    version?: string;
    dataStreams: ReviewDataStream[];
    categories?: string[];
}
export declare const ReviewApproveModal: React.FC<{
    isOpen: boolean;
    integrationId: string;
    onClose: () => void;
    onEdit: (integrationId: string) => void;
    onFetchReviewDetails: (integrationId: string) => Promise<ReviewIntegrationDetails>;
    onApproveAndInstall: (integrationId: string, version: string, categories: string[], autoInstallAfterApproval: boolean) => Promise<void>;
    onInstallToCluster?: (integrationId: string, options?: {
        skipSuccessToast?: boolean;
    }) => Promise<void>;
    DataStreamResultsFlyoutComponent?: DataStreamResultsFlyoutComponent;
}>;
export {};
