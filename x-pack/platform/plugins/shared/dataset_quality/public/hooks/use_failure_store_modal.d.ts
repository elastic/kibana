import React from 'react';
import type { FailureStoreFormData } from '@kbn/failure-store-modal';
export declare function useFailureStoreModal(): {
    isFailureStoreModalOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
    handleSaveModal: (data: FailureStoreFormData) => Promise<void>;
    canUserReadFailureStore: boolean;
    canUserManageFailureStore: boolean;
    hasFailureStore: boolean;
    defaultRetentionPeriod: string | undefined;
    customRetentionPeriod: string | undefined;
    renderModal: () => React.ReactElement | null;
};
