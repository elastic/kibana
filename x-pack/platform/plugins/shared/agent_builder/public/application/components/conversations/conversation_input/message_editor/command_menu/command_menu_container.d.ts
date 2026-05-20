import React from 'react';
import type { CommandMatchResult, CommandMenuHandle, CommandBadgeData } from './types';
interface CommandMenuContainerProps {
    commandMatch: CommandMatchResult;
    editorRef: React.RefObject<HTMLDivElement>;
    onSelect: (selection: CommandBadgeData) => void;
    commandMenuRef: React.RefObject<CommandMenuHandle>;
    children: React.ReactNode;
    'data-test-subj'?: string;
}
export declare const CommandMenuContainer: React.FC<CommandMenuContainerProps>;
export {};
