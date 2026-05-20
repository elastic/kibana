import type { FunctionComponent } from 'react';
import type { Pagination } from '@elastic/eui';
import type { CasesUI } from '../../../common/ui/types';
import type { CasesColumnSelection } from './types';
interface Props {
    isSelectorView?: boolean;
    totalCases: number;
    selectedCases: CasesUI;
    deselectCases: () => void;
    pagination: Pagination;
    selectedColumns: CasesColumnSelection[];
    onSelectedColumnsChange: (columns: CasesColumnSelection[]) => void;
    onClearFilters: () => void;
    showClearFiltersButton: boolean;
}
export declare const CasesTableUtilityBar: FunctionComponent<Props>;
export {};
