import React from 'react';
import { type IntegrationTile } from './data_sources_catalog_flyout';
export declare const ingestHubHistoryKey: unique symbol;
interface IntegrationDetailsFlyoutProps {
    tile: IntegrationTile;
    onClose: () => void;
    onDataConnected: () => void;
    onCloseAll: () => void;
}
export declare const IntegrationDetailsFlyout: React.FC<IntegrationDetailsFlyoutProps>;
export {};
