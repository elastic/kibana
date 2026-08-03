import React from 'react';
import type { CurrentUserProfile } from '../types';
export declare const NO_ASSIGNEES_VALUE: null;
export interface AssigneesFilterPopoverProps {
    selectedAssignees: Array<string | null>;
    currentUserProfile: CurrentUserProfile;
    isLoading: boolean;
    onSelectionChange: (params: {
        filterId: string;
        selectedOptionKeys: Array<string | null>;
    }) => void;
}
export declare const AssigneesFilterPopover: React.NamedExoticComponent<AssigneesFilterPopoverProps>;
