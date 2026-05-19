import React from 'react';
import type { ConnectorTypes } from '../../../common/types/domain';
interface Item {
    title: string;
    description: React.ReactNode;
}
interface ConnectorCardProps {
    connectorType: ConnectorTypes;
    title: string;
    listItems: Array<Item>;
    isLoading: boolean;
}
export declare const ConnectorCard: React.NamedExoticComponent<ConnectorCardProps>;
export {};
