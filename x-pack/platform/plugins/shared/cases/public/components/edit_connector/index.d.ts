import React from 'react';
import type { CaseUI, CaseConnectors } from '../../../common/ui/types';
import type { ActionConnector, CaseConnector } from '../../../common/types/domain';
export interface EditConnectorProps {
    caseData: CaseUI;
    caseConnectors: CaseConnectors;
    supportedActionConnectors: ActionConnector[];
    isLoading: boolean;
    onSubmit: (connector: CaseConnector) => void;
    showHeader?: boolean;
    /**
     * `icon` (default) matches the legacy pencil-icon-in-the-header look. `outlined`
     * renders the edit action as a labelled, bordered button alongside the push
     * button, matching the action buttons in the redesigned case header.
     */
    actionsVariant?: 'icon' | 'outlined';
}
export declare const EditConnector: React.MemoExoticComponent<({ caseData, caseConnectors, supportedActionConnectors, isLoading, onSubmit, showHeader, actionsVariant, }: EditConnectorProps) => React.JSX.Element>;
