import React from 'react';
interface ManagementBottomBarProps {
    confirmButtonText?: string;
    disabled?: boolean;
    insufficientPrivileges?: boolean;
    isLoading?: boolean;
    isInvalid?: boolean;
    streamType?: 'classic' | 'wired' | 'query' | 'unknown';
    onCancel: () => void;
    onConfirm: () => void;
    onViewCodeClick?: () => void;
}
export declare function ManagementBottomBar({ confirmButtonText, disabled, isLoading, insufficientPrivileges, isInvalid, streamType, onCancel, onConfirm, onViewCodeClick, }: ManagementBottomBarProps): React.JSX.Element;
export {};
