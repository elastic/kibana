import type { EuiTableActionsColumnType, EuiTableComputedColumnType, EuiTableFieldDataColumnType } from '@elastic/eui';
import type { SimilarCaseUI } from '../../../common/ui/types';
type SimilarCasesColumns = EuiTableActionsColumnType<SimilarCaseUI> | EuiTableComputedColumnType<SimilarCaseUI> | EuiTableFieldDataColumnType<SimilarCaseUI>;
export interface UseSimilarCasesColumnsReturnValue {
    columns: SimilarCasesColumns[];
    rowHeader: string;
}
export declare const useSimilarCasesColumns: () => UseSimilarCasesColumnsReturnValue;
export {};
