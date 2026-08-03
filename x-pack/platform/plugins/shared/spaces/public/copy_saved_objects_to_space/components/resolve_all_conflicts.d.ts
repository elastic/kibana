import React, { Component } from 'react';
import type { SummarizedCopyToSpaceResult } from '../lib';
import type { ImportRetry } from '../types';
export interface ResolveAllConflictsProps {
    summarizedCopyResult: SummarizedCopyToSpaceResult;
    retries: ImportRetry[];
    onRetriesChange: (retries: ImportRetry[]) => void;
    onDestinationMapChange: (value?: Map<string, string>) => void;
}
interface State {
    isPopoverOpen: boolean;
}
export declare class ResolveAllConflicts extends Component<ResolveAllConflictsProps, State> {
    state: {
        isPopoverOpen: boolean;
    };
    render(): React.JSX.Element;
    private onSelect;
    private onButtonClick;
    private closePopover;
}
export {};
