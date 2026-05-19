import type { EuiTableComputedColumnType } from '@elastic/eui';
import type { CaseUI } from '../../containers/types';
interface UseBulkActionsReturnValue {
    actions: EuiTableComputedColumnType<CaseUI> | null;
}
interface UseBulkActionsProps {
    disableActions: boolean;
}
export declare const useActions: ({ disableActions }: UseBulkActionsProps) => UseBulkActionsReturnValue;
export {};
