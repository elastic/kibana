import React from 'react';
import { type EuiBasicTableColumn } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { ActionConnector } from '../../../common/types/domain';
import type { CaseUI } from '../../../common/ui/types';
import type { CasesColumnSelection } from './types';
type CasesColumns = EuiBasicTableColumn<CaseUI>;
export interface GetCasesColumn {
    filterStatus: string[];
    userProfiles: Map<string, UserProfileWithAvatar>;
    isSelectorView: boolean;
    selectedColumns: CasesColumnSelection[];
    connectors?: ActionConnector[];
    onRowClick?: (theCase: CaseUI) => void;
    disableActions?: boolean;
    disabledCases?: Set<string>;
}
export interface UseCasesColumnsReturnValue {
    columns: CasesColumns[];
    isLoadingColumns: boolean;
    rowHeader: string;
}
export declare const useCasesColumns: ({ userProfiles, isSelectorView, connectors, onRowClick, disableActions, selectedColumns, disabledCases, }: GetCasesColumn) => UseCasesColumnsReturnValue;
interface Props {
    theCase: CaseUI;
    connectors: ActionConnector[];
}
export declare const ExternalServiceColumn: React.FC<Props>;
export {};
