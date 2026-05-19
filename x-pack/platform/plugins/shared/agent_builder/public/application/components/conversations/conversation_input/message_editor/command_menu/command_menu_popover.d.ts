import React from 'react';
import type { CommandMatchResult, AnchorPosition, CommandMenuHandle, CommandBadgeData } from './types';
interface CommandMenuPopoverProps {
    commandMatch: CommandMatchResult;
    anchorPosition: AnchorPosition | null;
    onSelect: (selection: CommandBadgeData) => void;
    commandMenuRef: React.RefObject<CommandMenuHandle>;
    'data-test-subj'?: string;
}
export declare const CommandMenuPopover: React.FC<CommandMenuPopoverProps>;
export {};
