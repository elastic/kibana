import React from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import type { Agent } from '../../../../../../common/types';
interface CollectorsTableProps {
    collectors: Agent[];
    isLoading: boolean;
    totalCount: number;
    pageIndex: number;
    pageSize: number;
    onTableChange: (criteria: CriteriaWithPagination<Agent>) => void;
}
export declare const CollectorsTable: React.FC<CollectorsTableProps>;
export {};
