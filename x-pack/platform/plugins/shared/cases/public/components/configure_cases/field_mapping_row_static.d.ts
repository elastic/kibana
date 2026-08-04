import React from 'react';
import type { ConnectorMappingSource, ConnectorMappingActionType, ConnectorMappingTarget } from '../../containers/configure/types';
export interface RowProps {
    isLoading: boolean;
    casesField: ConnectorMappingSource;
    selectedActionType: ConnectorMappingActionType;
    selectedThirdParty: ConnectorMappingTarget;
}
export declare const FieldMappingRowStatic: React.NamedExoticComponent<RowProps>;
