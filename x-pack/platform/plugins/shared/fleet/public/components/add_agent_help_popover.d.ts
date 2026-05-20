import type { ReactElement } from 'react';
import React from 'react';
import type { NoArgCallback } from '@elastic/eui';
export declare const AddAgentHelpPopover: ({ button, isOpen, offset, closePopover, }: {
    button: ReactElement;
    isOpen: boolean;
    offset?: number;
    closePopover: NoArgCallback<void>;
}) => React.JSX.Element;
