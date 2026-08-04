import React from 'react';
import type { ActionConnector } from '../../../common/types/domain';
interface Props {
    connectors: ActionConnector[];
    isLoading: boolean;
    isLoadingConnectors: boolean;
}
export declare const Connector: React.NamedExoticComponent<Props>;
export {};
