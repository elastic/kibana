import React from 'react';
export interface RevokeMcpClientModalProps {
    clientId: string;
    clientName: string;
    connectionCount: number;
    onClose: () => void;
}
export declare const RevokeMcpClientModal: ({ clientId, clientName, connectionCount, onClose, }: RevokeMcpClientModalProps) => React.JSX.Element;
