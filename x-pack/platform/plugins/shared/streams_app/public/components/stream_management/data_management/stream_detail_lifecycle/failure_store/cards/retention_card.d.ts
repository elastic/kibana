import React from 'react';
import type { useFailureStoreConfig } from '../../hooks/use_failure_store_config';
export declare const RetentionCard: ({ openModal, canManageFailureStore, streamName, failureStoreConfig, }: {
    openModal: (show: boolean) => void;
    canManageFailureStore: boolean;
    streamName: string;
    failureStoreConfig: ReturnType<typeof useFailureStoreConfig>;
}) => React.JSX.Element | null;
