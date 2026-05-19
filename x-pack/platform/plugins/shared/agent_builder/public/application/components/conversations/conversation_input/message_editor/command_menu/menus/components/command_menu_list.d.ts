import React from 'react';
import type { CommandMenuHandle } from '../../types';
export interface CommandMenuListOption {
    readonly key: string;
    /**
     * Plain string for accessibility and default label; use `renderLabel` for rich rows.
     */
    readonly label: string;
    readonly renderLabel?: React.ReactNode;
}
interface CommandMenuListProps {
    readonly options: readonly CommandMenuListOption[];
    readonly isLoading: boolean;
    readonly onSelect: (option: CommandMenuListOption) => void;
    readonly width?: number;
    readonly 'data-test-subj'?: string;
}
export declare const CommandMenuList: React.ForwardRefExoticComponent<CommandMenuListProps & React.RefAttributes<CommandMenuHandle>>;
export {};
