import React from 'react';
export declare const CompactLogoIcon: React.FC<{
    src: string;
    alt: string;
}>;
export declare const CardLogoIcon: React.FC<{
    src: string;
    alt: string;
}>;
export interface IntegrationTile {
    id: string;
    name: string;
    description: string;
    logoDomain: string;
    logoUrl?: string;
    /** When true, renders a small "catalogue" suffix badge on the card */
    catalogue?: boolean;
}
export declare function DataSourcesCatalogFlyout({ onClose, onDataConnected, initialView, }: {
    onClose: () => void;
    onDataConnected: () => void;
    initialView?: import('./catalog_modal_history').CatalogModalView;
}): React.JSX.Element;
