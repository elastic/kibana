import type { CasesColumnSelection } from '../types';
export declare function useListFieldsSelection(): {
    selectedFields: import("../../../all_cases/types").CasesColumnSelection[];
    setSelectedFields: (newItem: CasesColumnSelection[] | ((prev: CasesColumnSelection[]) => CasesColumnSelection[])) => void;
};
