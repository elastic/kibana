import React from 'react';
import type { EuiTableComputedColumnType } from '@elastic/eui';
import type { CaseUI } from '../../containers/types';
export declare const ActionColumnComponent: React.FC<{
    theCase: CaseUI;
    disableActions: boolean;
}>;
interface UseBulkActionsReturnValue {
    actions: EuiTableComputedColumnType<CaseUI> | null;
}
interface UseBulkActionsProps {
    disableActions: boolean;
}
export declare const useActions: ({ disableActions }: UseBulkActionsProps) => UseBulkActionsReturnValue;
export {};
