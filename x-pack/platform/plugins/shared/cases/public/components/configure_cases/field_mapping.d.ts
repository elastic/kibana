import React from 'react';
import type { CaseConnectorMapping } from '../../containers/configure/types';
export interface FieldMappingProps {
    actionTypeName: string;
    isLoading: boolean;
    mappings: CaseConnectorMapping[];
}
export declare const FieldMapping: React.NamedExoticComponent<FieldMappingProps>;
