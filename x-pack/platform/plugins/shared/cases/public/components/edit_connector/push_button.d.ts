import React from 'react';
import type { ErrorMessage } from '../use_push_to_service/callout/types';
interface PushButtonProps {
    isLoading: boolean;
    disabled: boolean;
    errorsMsg: ErrorMessage[];
    hasBeenPushed: boolean;
    showTooltip: boolean;
    connectorName: string;
    pushToService: () => Promise<void>;
    /**
     * `empty` (default) matches the legacy text-link look. `outlined` renders a
     * bordered button, matching the action buttons in the redesigned case header.
     */
    variant?: 'empty' | 'outlined';
}
export declare const PushButton: React.NamedExoticComponent<PushButtonProps>;
export {};
