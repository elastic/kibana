import React from 'react';
import type { CreatedIntegrationRow, DataStreamResultsFlyoutComponent } from './manage_integrations_table';
import type { ReviewIntegrationDetails } from './review_approve_modal';
export type { ReviewIntegrationDetails } from './review_approve_modal';
export declare const ManageIntegrationActions: React.FC<{
    integration: CreatedIntegrationRow;
    isPackageReady: boolean;
    installedVersion?: string;
    inlineActionType?: 'reviewApprove' | 'editIntegration';
    showMenuButton?: boolean;
    onEdit: (integrationId: string) => void;
    onDelete: (integrationId: string) => Promise<void>;
    DataStreamResultsFlyoutComponent?: DataStreamResultsFlyoutComponent;
    onFetchReviewDetails: (integrationId: string) => Promise<ReviewIntegrationDetails>;
    onApproveAndInstall: (integrationId: string, version: string, categories: string[], autoInstallAfterApproval: boolean) => Promise<void>;
    onDownloadZip?: (integrationId: string) => Promise<void>;
    onInstallToCluster?: (integrationId: string, options?: {
        skipSuccessToast?: boolean;
    }) => Promise<void>;
}>;
