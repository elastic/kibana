import type { FunctionComponent } from 'react';
import type { Pagination } from '@elastic/eui';
import type { CasesUI } from '../../../../../common/ui/types';
import { type ViewToggleId } from '../constants';
interface Props {
    isSelectorView?: boolean;
    totalCases: number;
    selectedCases: CasesUI;
    deselectCases: () => void;
    pagination: Pagination;
    onClearFilters: () => void;
    showClearFiltersButton: boolean;
    viewMode: ViewToggleId;
    onSelectAll: () => void;
    totalOnPage: number;
}
export declare const CasesTableUtilityBar: FunctionComponent<Props>;
export {};
