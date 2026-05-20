import type { IconType } from '@elastic/eui';
import type { PropsWithChildren } from 'react';
import React from 'react';
export declare const InputPopoverButton: React.FC<PropsWithChildren<{
    open: boolean;
    disabled: boolean;
    iconType: IconType;
    onClick: () => void;
    'aria-label'?: string;
    'data-test-subj'?: string;
}>>;
