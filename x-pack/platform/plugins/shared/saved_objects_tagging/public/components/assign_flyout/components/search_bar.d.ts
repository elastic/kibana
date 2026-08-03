import type { FC } from 'react';
export interface AssignFlyoutSearchBarProps {
    onChange: (args: any) => void | boolean;
    isLoading: boolean;
    types: string[];
}
export declare const AssignFlyoutSearchBar: FC<AssignFlyoutSearchBarProps>;
