import React from 'react';
import type { ApplicationConnectionsEntityKind } from '../constants/types';
export interface ApplicationConnectionsTableHeaderProps {
    isLoading: boolean;
    pageIndex: number;
    pageSize: number;
    visibleCount: number;
    totalCount: number;
    entityKind: ApplicationConnectionsEntityKind;
}
export declare const ApplicationConnectionsTableHeader: ({ isLoading, pageIndex, pageSize, visibleCount, totalCount, entityKind, }: ApplicationConnectionsTableHeaderProps) => React.JSX.Element;
