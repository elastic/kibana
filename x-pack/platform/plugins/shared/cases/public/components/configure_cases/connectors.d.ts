import React from 'react';
import type { ActionConnector, CaseConnectorMapping } from '../../containers/configure/types';
import type { ActionTypeConnector } from '../../../common/types/domain';
import { ConnectorTypes } from '../../../common/types/domain';
export interface Props {
    actionTypes: ActionTypeConnector[];
    connectors: ActionConnector[];
    disabled: boolean;
    handleShowEditFlyout: () => void;
    isLoading: boolean;
    mappings: CaseConnectorMapping[];
    onChangeConnector: (id: string) => void;
    selectedConnector: {
        id: string;
        type: ConnectorTypes;
    };
    updateConnectorDisabled: boolean;
    onAddNewConnector: () => void;
}
export declare const Connectors: React.NamedExoticComponent<Props>;
