import React from 'react';
import type { EuiDataGridColumn } from '@elastic/eui';
export interface TestQueryRowTableProps {
    preview: {
        cols: EuiDataGridColumn[];
        rows: Array<Record<string, string | null | undefined>>;
    };
}
export declare const TestQueryRowTable: React.FC<TestQueryRowTableProps>;
