import type { FunctionComponent, MutableRefObject } from 'react';
import type { EuiTableSelectionType, EuiBasicTableProps, Pagination } from '@elastic/eui';
import { EuiBasicTable } from '@elastic/eui';
import type { CasesFindResponseUI, CaseUI } from '../../../common/ui/types';
interface CasesTableProps {
    columns: EuiBasicTableProps<CaseUI>['columns'];
    data: CasesFindResponseUI;
    goToCreateCase?: () => void;
    isCasesLoading: boolean;
    isCommentUpdating: boolean;
    isDataEmpty: boolean;
    isSelectorView?: boolean;
    onChange: EuiBasicTableProps<CaseUI>['onChange'];
    pagination: Pagination;
    selection: EuiTableSelectionType<CaseUI>;
    sorting: EuiBasicTableProps<CaseUI>['sorting'];
    tableRef?: MutableRefObject<EuiBasicTable | null>;
    tableRowProps: EuiBasicTableProps<CaseUI>['rowProps'];
    isLoadingColumns: boolean;
    rowHeader?: string;
}
export declare const CasesTable: FunctionComponent<CasesTableProps>;
export {};
