import React from 'react';
import type { CaseConnectors, CaseUI } from '../../../common/ui/types';
import type { CaseActionConnector } from '../types';
import type { CaseConnector } from '../../../common/types/domain';
interface Props {
    caseData: CaseUI;
    caseConnectors: CaseConnectors;
    supportedActionConnectors: CaseActionConnector[];
    isLoading: boolean;
    onSubmit(connector: CaseConnector): void;
    onCancel(): void;
}
export declare const ConnectorsForm: React.NamedExoticComponent<Props>;
export {};
