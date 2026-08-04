import React from 'react';
import type { ActionConnector } from '../../containers/configure/types';
export interface Props {
    connectors: ActionConnector[];
    disabled: boolean;
    isLoading: boolean;
    onChange: (id: string) => void;
    selectedConnector: string;
}
export declare const ConnectorsDropdown: React.NamedExoticComponent<Props>;
