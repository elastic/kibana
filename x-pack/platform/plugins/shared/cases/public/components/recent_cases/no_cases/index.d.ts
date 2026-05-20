import React from 'react';
import type { FilterMode as RecentCasesFilterMode } from '../types';
export interface NoCasesComp {
    recentCasesFilterBy: RecentCasesFilterMode;
}
export declare const NoCases: React.MemoExoticComponent<{
    ({ recentCasesFilterBy }: NoCasesComp): React.ReactElement<any, string | React.JSXElementConstructor<any>>;
    displayName: string;
}>;
