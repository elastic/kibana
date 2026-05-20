import type { FunctionComponent } from 'react';
import React from 'react';
export interface Props {
    isVisible: boolean;
    isDisabled: boolean;
    /**
     * Useful for buttons at the very top or bottom of lists to avoid any overflow.
     */
    compressed?: boolean;
    availableAriaLabel?: string;
    unavailableAriaLabel?: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    'data-test-subj'?: string;
}
export declare const DropZoneButton: FunctionComponent<Props>;
