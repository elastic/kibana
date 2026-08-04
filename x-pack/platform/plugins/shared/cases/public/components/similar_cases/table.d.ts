import type { FunctionComponent } from 'react';
import type { EuiBasicTableProps, Pagination } from '@elastic/eui';
import type { SimilarCaseUI } from '../../../common/ui/types';
export interface SimilarCasesTableProps {
    cases: SimilarCaseUI[];
    isLoading: boolean;
    onChange: EuiBasicTableProps<SimilarCaseUI>['onChange'];
    pagination: Pagination;
}
export declare const SimilarCasesTable: FunctionComponent<SimilarCasesTableProps>;
