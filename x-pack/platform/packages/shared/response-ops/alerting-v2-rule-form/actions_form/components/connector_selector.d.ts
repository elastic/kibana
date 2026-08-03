import React from 'react';
interface ConnectorSelectorProps {
    connectorTypeId: string;
    value: string | null;
    onChange: (connectorId: string | null) => void;
}
export declare const ConnectorSelector: ({ connectorTypeId, value, onChange }: ConnectorSelectorProps) => React.JSX.Element;
export {};
