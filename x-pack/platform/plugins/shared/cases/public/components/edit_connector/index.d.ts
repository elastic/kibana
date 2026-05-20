import React from 'react';
import type { CaseUI, CaseConnectors } from '../../../common/ui/types';
import type { ActionConnector, CaseConnector } from '../../../common/types/domain';
export interface EditConnectorProps {
    caseData: CaseUI;
    caseConnectors: CaseConnectors;
    supportedActionConnectors: ActionConnector[];
    isLoading: boolean;
    onSubmit: (connector: CaseConnector) => void;
}
export declare const EditConnector: React.MemoExoticComponent<({ caseData, caseConnectors, supportedActionConnectors, isLoading, onSubmit, }: EditConnectorProps) => React.JSX.Element>;
