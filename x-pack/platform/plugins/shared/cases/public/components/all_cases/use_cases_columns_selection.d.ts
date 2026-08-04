import type { CasesColumnSelection } from './types';
export declare function useCasesColumnsSelection(): {
    selectedColumns: CasesColumnSelection[];
    setSelectedColumns: (newItem: CasesColumnSelection[] | ((prev: CasesColumnSelection[]) => CasesColumnSelection[])) => void;
};
