import React from 'react';
interface ConfirmRemoveConfig {
    title: string;
    body: string;
    confirmButtonText: string;
    cancelButtonText: string;
    onConfirm: () => void;
}
export interface DetailPanelLayoutProps {
    isLoading: boolean;
    isEmpty: boolean;
    title: string;
    isReadOnly?: boolean;
    headerActions: (openConfirmRemove: () => void) => React.ReactNode;
    headerContent?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    confirmRemove?: ConfirmRemoveConfig;
}
export declare const DetailPanelLayout: React.FC<DetailPanelLayoutProps>;
export {};
