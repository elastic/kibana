import React from 'react';
import { ConnectorTypes } from '../../../common/types/domain';
import type { CaseConnectorMapping } from '../../containers/configure/types';
export interface MappingProps {
    actionTypeName: string;
    connectorType: ConnectorTypes;
    isLoading: boolean;
    mappings: CaseConnectorMapping[];
}
export declare const Mapping: React.NamedExoticComponent<MappingProps>;
