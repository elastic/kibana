import React from 'react';
interface BaseLifecyclePhaseProps {
    color?: string;
    description?: string;
    docsCount?: number;
    isReadOnly?: boolean;
    label: string;
    minAge?: string;
    onClick?: () => void;
    searchableSnapshot?: string;
    size?: string;
    sizeInBytes?: number;
    testSubjPrefix?: string;
    showActions?: boolean;
    onRemovePhase?: (phaseName: string) => void;
    onEditPhase?: (phaseName: string) => void;
    isBeingEdited?: boolean;
    canManageLifecycle: boolean;
    isRemoveDisabled?: boolean;
    removeDisabledReason?: string;
    isEditLifecycleFlyoutOpen?: boolean;
}
interface DeleteLifecyclePhaseProps extends BaseLifecyclePhaseProps {
    isDelete: true;
}
interface StandardLifecyclePhaseProps extends BaseLifecyclePhaseProps {
    color: string;
    isDelete?: false;
}
export type LifecyclePhaseProps = DeleteLifecyclePhaseProps | StandardLifecyclePhaseProps;
export declare const LifecyclePhase: (props: LifecyclePhaseProps) => React.JSX.Element;
export {};
